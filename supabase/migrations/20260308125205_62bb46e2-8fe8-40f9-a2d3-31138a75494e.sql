
-- =============================================================================
-- MOD-06 Gap Fixes: GAP-1, GAP-2, GAP-3, GAP-10, GAP-11, GAP-12
-- =============================================================================

-- GAP-3 + GAP-12: Recreate reassign_verification with p_ip_address param + config lookup
CREATE OR REPLACE FUNCTION public.reassign_verification(
  p_verification_id UUID,
  p_to_admin_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT '',
  p_initiator TEXT DEFAULT 'SUPERVISOR',
  p_trigger TEXT DEFAULT 'MANUAL',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verification RECORD;
  v_from_admin_id UUID;
  v_max_reassignments INT;
  v_audit_reason TEXT;
  v_new_assignment_id UUID;
BEGIN
  -- GAP-12: Read max from config with fallback
  SELECT COALESCE(param_value::INTEGER, 3)
    INTO v_max_reassignments
    FROM md_mpa_config
   WHERE param_key = 'max_reassignments_per_verification';
  IF v_max_reassignments IS NULL THEN
    v_max_reassignments := 3;
  END IF;

  -- Lock verification row
  SELECT id, assigned_admin_id, status, reassignment_count
    INTO v_verification
    FROM platform_admin_verifications
   WHERE id = p_verification_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  v_from_admin_id := v_verification.assigned_admin_id;

  -- BR-MPA-045: Limit check blocks ADMIN only
  IF p_initiator = 'ADMIN' AND v_verification.reassignment_count >= v_max_reassignments THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASSIGNMENT_LIMIT_REACHED');
  END IF;

  -- Check target admin exists and is not fully loaded (if specified)
  IF p_to_admin_id IS NOT NULL THEN
    DECLARE
      v_target RECORD;
    BEGIN
      SELECT id, availability_status, current_active_verifications, max_concurrent_verifications
        INTO v_target
        FROM platform_admin_profiles
       WHERE id = p_to_admin_id AND availability_status IN ('Available', 'Reduced_Capacity');

      IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'TARGET_ADMIN_NOT_FOUND');
      END IF;

      IF v_target.current_active_verifications >= v_target.max_concurrent_verifications THEN
        RETURN jsonb_build_object('success', false, 'error', 'TARGET_AT_CAPACITY');
      END IF;
    END;
  END IF;

  -- BR-MPA-040: Update verification (sla_start_at NOT touched)
  UPDATE platform_admin_verifications
     SET assigned_admin_id = p_to_admin_id,
         reassignment_count = reassignment_count + 1,
         updated_at = NOW()
   WHERE id = p_verification_id;

  -- Close old assignment
  UPDATE verification_assignments
     SET is_current = false,
         closed_at = NOW(),
         close_reason = 'REASSIGNED'
   WHERE verification_id = p_verification_id
     AND is_current = true;

  -- Open new assignment (if target specified)
  IF p_to_admin_id IS NOT NULL THEN
    INSERT INTO verification_assignments (
      verification_id, admin_id, assigned_at, assignment_method, is_current
    ) VALUES (
      p_verification_id, p_to_admin_id, NOW(), 'REASSIGNED_SUPERVISOR', true
    )
    RETURNING id INTO v_new_assignment_id;
  END IF;

  -- GAP-3: Build audit reason with IP
  v_audit_reason := p_reason;
  IF p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
    v_audit_reason := v_audit_reason || ' [IP: ' || p_ip_address || ']';
  END IF;

  -- Audit log (BR-MPA-043)
  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    reason, initiator, created_at
  ) VALUES (
    p_verification_id, 'REASSIGNED', v_from_admin_id, p_to_admin_id,
    v_audit_reason, p_initiator || ':' || p_trigger, NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'from_admin_id', v_from_admin_id,
    'to_admin_id', p_to_admin_id
  );
END;
$$;

-- GAP-2: place_in_open_queue RPC (separate path, no limit check)
CREATE OR REPLACE FUNCTION public.place_in_open_queue(
  p_verification_id UUID,
  p_reason TEXT DEFAULT '',
  p_ip_address TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from_admin_id UUID;
  v_audit_reason TEXT;
BEGIN
  -- Lock and get current admin
  SELECT assigned_admin_id INTO v_from_admin_id
    FROM platform_admin_verifications
   WHERE id = p_verification_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  -- BR-MPA-040: sla_start_at NOT touched
  UPDATE platform_admin_verifications
     SET assigned_admin_id = NULL,
         reassignment_count = reassignment_count + 1,
         updated_at = NOW()
   WHERE id = p_verification_id;

  -- Close current assignment
  UPDATE verification_assignments
     SET is_current = false,
         closed_at = NOW(),
         close_reason = 'PLACED_IN_QUEUE'
   WHERE verification_id = p_verification_id
     AND is_current = true;

  -- Audit
  v_audit_reason := p_reason;
  IF p_ip_address IS NOT NULL AND p_ip_address <> '' THEN
    v_audit_reason := v_audit_reason || ' [IP: ' || p_ip_address || ']';
  END IF;

  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    reason, initiator, created_at
  ) VALUES (
    p_verification_id, 'PLACED_IN_QUEUE', v_from_admin_id, NULL,
    v_audit_reason, 'SUPERVISOR:MANUAL', NOW()
  );

  RETURN jsonb_build_object('success', true, 'from_admin_id', v_from_admin_id);
END;
$$;

-- GAP-10 + GAP-11: Recreate bulk_reassign_admin with skip + method override
CREATE OR REPLACE FUNCTION public.bulk_reassign_admin(
  p_departing_admin_id UUID,
  p_trigger TEXT DEFAULT 'LEAVE'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec RECORD;
  v_total INT := 0;
  v_assigned INT := 0;
  v_queued INT := 0;
  v_results JSONB := '[]'::JSONB;
  v_auto_result JSONB;
BEGIN
  FOR v_rec IN
    SELECT id
      FROM platform_admin_verifications
     WHERE assigned_admin_id = p_departing_admin_id
       AND status = 'Under_Verification'
     ORDER BY sla_start_at ASC NULLS LAST
     FOR UPDATE
  LOOP
    v_total := v_total + 1;

    -- Close current assignment
    UPDATE verification_assignments
       SET is_current = false,
           closed_at = NOW(),
           close_reason = 'BULK_REASSIGNED'
     WHERE verification_id = v_rec.id
       AND is_current = true;

    -- Unassign
    UPDATE platform_admin_verifications
       SET assigned_admin_id = NULL,
           reassignment_count = reassignment_count + 1,
           updated_at = NOW()
     WHERE id = v_rec.id;

    -- Try auto-assignment, GAP-10: skip departing admin
    BEGIN
      SELECT public.execute_auto_assignment(v_rec.id, p_departing_admin_id) INTO v_auto_result;

      IF (v_auto_result->>'success')::BOOLEAN THEN
        v_assigned := v_assigned + 1;

        -- GAP-11: Override assignment_method to REASSIGNED_SYSTEM
        UPDATE verification_assignments
           SET assignment_method = 'REASSIGNED_SYSTEM'
         WHERE verification_id = v_rec.id
           AND is_current = true;

        UPDATE verification_assignment_log
           SET event_type = 'REASSIGNED',
               initiator = 'SYSTEM:' || p_trigger
         WHERE verification_id = v_rec.id
           AND created_at = (
             SELECT MAX(created_at) FROM verification_assignment_log WHERE verification_id = v_rec.id
           );

        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'verification_id', v_rec.id, 'outcome', 'ASSIGNED'));
      ELSE
        v_queued := v_queued + 1;
        v_results := v_results || jsonb_build_array(jsonb_build_object(
          'verification_id', v_rec.id, 'outcome', 'QUEUED'));
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_queued := v_queued + 1;
      v_results := v_results || jsonb_build_array(jsonb_build_object(
        'verification_id', v_rec.id, 'outcome', 'QUEUED'));
    END;

    -- Audit log
    INSERT INTO verification_assignment_log (
      verification_id, event_type, from_admin_id, to_admin_id,
      reason, initiator, created_at
    ) VALUES (
      v_rec.id, 'BULK_REASSIGNED', p_departing_admin_id, NULL,
      'Bulk reassignment: admin ' || p_trigger, 'SYSTEM:' || p_trigger, NOW()
    );
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'assigned', v_assigned,
    'queued', v_queued,
    'results', v_results
  );
END;
$$;

-- GAP-1: Trigger function for on_admin_leave
CREATE OR REPLACE FUNCTION public.fn_trigger_bulk_reassign()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire on fresh transition INTO On_Leave or Inactive (idempotent, EC-06-10)
  IF (OLD.availability_status IS DISTINCT FROM NEW.availability_status)
     AND NEW.availability_status IN ('On_Leave', 'Inactive')
     AND OLD.availability_status NOT IN ('On_Leave', 'Inactive')
  THEN
    -- Check if admin has active verifications
    IF EXISTS (
      SELECT 1 FROM platform_admin_verifications
       WHERE assigned_admin_id = NEW.id
         AND status = 'Under_Verification'
    ) THEN
      -- Fire bulk-reassign edge function asynchronously via pg_net
      PERFORM net.http_post(
        url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_url') || '/functions/v1/bulk-reassign',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key')
        ),
        body := jsonb_build_object(
          'departing_admin_id', NEW.id,
          'trigger', CASE WHEN NEW.availability_status = 'On_Leave' THEN 'LEAVE' ELSE 'DEACTIVATION' END
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- GAP-1: Create the trigger
DROP TRIGGER IF EXISTS on_admin_leave ON public.platform_admin_profiles;
CREATE TRIGGER on_admin_leave
  AFTER UPDATE OF availability_status ON public.platform_admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_trigger_bulk_reassign();
