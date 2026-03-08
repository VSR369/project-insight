
-- ============================================================
-- MOD-06: Reassignment Workflow — Database Objects
-- ============================================================

-- TABLE-06-01: reassignment_requests
CREATE TABLE IF NOT EXISTS public.reassignment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES public.platform_admin_verifications(id) ON DELETE CASCADE,
  requesting_admin_id UUID NOT NULL REFERENCES public.platform_admin_profiles(id),
  suggested_admin_id UUID REFERENCES public.platform_admin_profiles(id),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'DECLINED')),
  actioned_by_id UUID REFERENCES public.platform_admin_profiles(id),
  actioned_at TIMESTAMPTZ,
  decline_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Validation trigger for reason min length
CREATE OR REPLACE FUNCTION public.fn_validate_reassignment_request()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF length(trim(NEW.reason)) < 20 THEN
    RAISE EXCEPTION 'Reason must be at least 20 characters';
  END IF;
  IF NEW.status = 'DECLINED' AND (NEW.decline_reason IS NULL OR length(trim(NEW.decline_reason)) < 20) THEN
    RAISE EXCEPTION 'Decline reason must be at least 20 characters';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_reassignment_request ON public.reassignment_requests;
CREATE TRIGGER trg_validate_reassignment_request
  BEFORE INSERT OR UPDATE ON public.reassignment_requests
  FOR EACH ROW EXECUTE FUNCTION public.fn_validate_reassignment_request();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_rr_pending ON public.reassignment_requests (status, created_at)
  WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_rr_verification ON public.reassignment_requests (verification_id);
CREATE INDEX IF NOT EXISTS idx_rr_requesting_admin ON public.reassignment_requests (requesting_admin_id);

-- RLS
ALTER TABLE public.reassignment_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "supervisor_select_reassignment_requests"
  ON public.reassignment_requests FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    )
  );

CREATE POLICY "own_select_reassignment_requests"
  ON public.reassignment_requests FOR SELECT TO authenticated
  USING (
    requesting_admin_id IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "own_insert_reassignment_requests"
  ON public.reassignment_requests FOR INSERT TO authenticated
  WITH CHECK (
    requesting_admin_id IN (
      SELECT id FROM public.platform_admin_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "supervisor_update_reassignment_requests"
  ON public.reassignment_requests FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    )
  );

-- ============================================================
-- API-06-01: reassign_verification RPC
-- ============================================================
CREATE OR REPLACE FUNCTION public.reassign_verification(
  p_verification_id UUID,
  p_to_admin_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT '',
  p_initiator TEXT DEFAULT 'SUPERVISOR',
  p_trigger TEXT DEFAULT 'MANUAL',
  p_requesting_admin_id UUID DEFAULT NULL,
  p_supervisor_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_admin_id UUID;
  v_current_assignment_id UUID;
  v_max_reassignments INT := 3;
  v_current_count INT;
  v_max_concurrent INT;
  v_active_count INT;
  v_caller_profile_id UUID;
BEGIN
  -- Get caller profile
  SELECT id INTO v_caller_profile_id
  FROM platform_admin_profiles
  WHERE user_id = auth.uid();

  -- Lock the verification row
  SELECT assigned_admin_id, reassignment_count
  INTO v_current_admin_id, v_current_count
  FROM platform_admin_verifications
  WHERE id = p_verification_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  -- BR-MPA-045: Admin initiator blocked at limit (supervisor/system bypass)
  IF p_initiator = 'ADMIN' AND v_current_count >= v_max_reassignments THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASSIGNMENT_LIMIT_REACHED');
  END IF;

  -- Check target admin capacity if assigning to specific admin
  IF p_to_admin_id IS NOT NULL THEN
    SELECT max_concurrent_verifications, current_active_verifications
    INTO v_max_concurrent, v_active_count
    FROM platform_admin_profiles
    WHERE id = p_to_admin_id AND availability_status NOT IN ('Inactive', 'On_Leave');

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'TARGET_ADMIN_NOT_FOUND');
    END IF;

    IF v_active_count >= v_max_concurrent THEN
      RETURN jsonb_build_object('success', false, 'error', 'TARGET_AT_CAPACITY');
    END IF;
  END IF;

  -- Close current assignment
  SELECT id INTO v_current_assignment_id
  FROM verification_assignments
  WHERE verification_id = p_verification_id AND is_current = true;

  IF v_current_assignment_id IS NOT NULL THEN
    UPDATE verification_assignments
    SET is_current = false, released_at = NOW(), release_reason = p_reason
    WHERE id = v_current_assignment_id;
  END IF;

  -- BR-MPA-040: Update verification WITHOUT touching sla_start_at
  IF p_to_admin_id IS NOT NULL THEN
    UPDATE platform_admin_verifications
    SET assigned_admin_id = p_to_admin_id,
        reassignment_count = reassignment_count + 1,
        assignment_method = 'REASSIGNED_' || p_initiator,
        updated_at = NOW()
    WHERE id = p_verification_id;

    -- Create new assignment record
    INSERT INTO verification_assignments (
      verification_id, assigned_admin_id, assigned_at, is_current,
      assignment_method, scoring_details
    ) VALUES (
      p_verification_id, p_to_admin_id, NOW(), true,
      'REASSIGNED_' || p_initiator,
      jsonb_build_object('trigger', p_trigger, 'reason', p_reason)
    );

    -- Update workload counters
    IF v_current_admin_id IS NOT NULL THEN
      UPDATE platform_admin_profiles
      SET current_active_verifications = GREATEST(current_active_verifications - 1, 0)
      WHERE id = v_current_admin_id;
    END IF;

    UPDATE platform_admin_profiles
    SET current_active_verifications = current_active_verifications + 1,
        last_assignment_timestamp = NOW()
    WHERE id = p_to_admin_id;
  ELSE
    -- Place in open queue
    UPDATE platform_admin_verifications
    SET assigned_admin_id = NULL,
        reassignment_count = reassignment_count + 1,
        assignment_method = 'QUEUE_REASSIGNED',
        updated_at = NOW()
    WHERE id = p_verification_id;

    INSERT INTO open_queue_entries (verification_id, entered_at, sla_deadline)
    SELECT p_verification_id, NOW(),
      COALESCE(sla_start_at + (sla_duration_seconds * INTERVAL '1 second'), NOW() + INTERVAL '5 days')
    FROM platform_admin_verifications
    WHERE id = p_verification_id;

    IF v_current_admin_id IS NOT NULL THEN
      UPDATE platform_admin_profiles
      SET current_active_verifications = GREATEST(current_active_verifications - 1, 0)
      WHERE id = v_current_admin_id;
    END IF;
  END IF;

  -- BR-MPA-043: Audit log
  INSERT INTO verification_assignment_log (
    verification_id, event_type, initiator, from_admin_id, to_admin_id,
    reason, scoring_snapshot, created_at
  ) VALUES (
    p_verification_id,
    'REASSIGNED',
    COALESCE(v_caller_profile_id::text, p_initiator),
    v_current_admin_id,
    p_to_admin_id,
    p_reason,
    jsonb_build_object('initiator', p_initiator, 'trigger', p_trigger),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'from_admin_id', v_current_admin_id,
    'to_admin_id', p_to_admin_id
  );
END;
$$;

-- ============================================================
-- API-06-02: bulk_reassign_admin RPC
-- ============================================================
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
  v_results JSONB := '[]'::jsonb;
  v_assign_result JSONB;
BEGIN
  -- Permission check: must be supervisor or service_role (auth.uid() is null)
  IF auth.uid() IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM platform_admin_profiles
      WHERE user_id = auth.uid() AND admin_tier = 'supervisor'
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'PERMISSION_DENIED');
    END IF;
  END IF;

  -- Loop over Under_Verification only (BR-MPA-044)
  FOR v_rec IN
    SELECT pav.id AS verification_id
    FROM platform_admin_verifications pav
    WHERE pav.assigned_admin_id = p_departing_admin_id
      AND pav.status = 'Under_Verification'
    ORDER BY pav.sla_start_at ASC NULLS LAST
  LOOP
    v_total := v_total + 1;

    BEGIN
      SELECT public.execute_auto_assignment(v_rec.verification_id) INTO v_assign_result;
      IF (v_assign_result->>'outcome') = 'ASSIGNED' THEN
        v_assigned := v_assigned + 1;
      ELSE
        v_queued := v_queued + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      v_queued := v_queued + 1;
      INSERT INTO open_queue_entries (verification_id, entered_at, sla_deadline)
      SELECT v_rec.verification_id, NOW(),
        COALESCE(pav.sla_start_at + (pav.sla_duration_seconds * INTERVAL '1 second'), NOW() + INTERVAL '5 days')
      FROM platform_admin_verifications pav
      WHERE pav.id = v_rec.verification_id
      ON CONFLICT DO NOTHING;
    END;

    v_results := v_results || jsonb_build_object(
      'verification_id', v_rec.verification_id,
      'outcome', CASE WHEN (v_assign_result IS NOT NULL AND (v_assign_result->>'outcome') = 'ASSIGNED') THEN 'assigned' ELSE 'queued' END
    );
  END LOOP;

  -- Clear departing admin's workload
  UPDATE platform_admin_profiles
  SET current_active_verifications = 0
  WHERE id = p_departing_admin_id;

  RETURN jsonb_build_object(
    'success', true,
    'total', v_total,
    'assigned', v_assigned,
    'queued', v_queued,
    'results', v_results
  );
END;
$$;

-- ============================================================
-- Update request_reassignment to INSERT into reassignment_requests
-- ============================================================
CREATE OR REPLACE FUNCTION public.request_reassignment(
  p_verification_id UUID,
  p_reason TEXT,
  p_target_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_count INT;
  v_max INT := 3;
BEGIN
  SELECT id INTO v_admin_id
  FROM platform_admin_profiles
  WHERE user_id = auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AN_ADMIN');
  END IF;

  SELECT reassignment_count INTO v_count
  FROM platform_admin_verifications
  WHERE id = p_verification_id AND assigned_admin_id = v_admin_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_ASSIGNED_TO_YOU');
  END IF;

  IF v_count >= v_max THEN
    RETURN jsonb_build_object('success', false, 'error', 'REASSIGNMENT_LIMIT_REACHED');
  END IF;

  -- Create PENDING request
  INSERT INTO reassignment_requests (
    verification_id, requesting_admin_id, suggested_admin_id, reason, status
  ) VALUES (
    p_verification_id, v_admin_id, p_target_admin_id, p_reason, 'PENDING'
  );

  -- Audit log
  INSERT INTO verification_assignment_log (
    verification_id, event_type, initiator, reason, scoring_snapshot, created_at
  ) VALUES (
    p_verification_id,
    'REASSIGNMENT_REQUESTED',
    v_admin_id::text,
    p_reason,
    jsonb_build_object('suggested_admin_id', p_target_admin_id),
    NOW()
  );

  -- Notify supervisors
  INSERT INTO admin_notifications (admin_id, type, title, body, deep_link, metadata)
  SELECT
    pap.id,
    'REASSIGNMENT_REQUEST',
    'Reassignment Request',
    'Admin has requested reassignment for a verification.',
    '/admin/reassignments',
    jsonb_build_object('verification_id', p_verification_id, 'requesting_admin_id', v_admin_id)
  FROM platform_admin_profiles pap
  WHERE pap.admin_tier = 'supervisor';

  RETURN jsonb_build_object('success', true);
END;
$$;
