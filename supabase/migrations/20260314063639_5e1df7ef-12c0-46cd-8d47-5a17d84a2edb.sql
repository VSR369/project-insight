
CREATE OR REPLACE FUNCTION public.claim_from_queue(p_queue_entry_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_id UUID;
  v_admin_name TEXT;
  v_verification_id UUID;
  v_queue_row open_queue_entries%ROWTYPE;
BEGIN
  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM platform_admin_profiles
  WHERE user_id = auth.uid();

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_AN_ADMIN');
  END IF;

  PERFORM 1 FROM platform_admin_profiles
  WHERE id = v_admin_id
    AND current_active_verifications >= max_concurrent_verifications;
  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'AT_CAPACITY');
  END IF;

  BEGIN
    SELECT * INTO v_queue_row
    FROM open_queue_entries
    WHERE id = p_queue_entry_id
      AND claimed_by IS NULL
    FOR UPDATE NOWAIT;
  EXCEPTION WHEN lock_not_available THEN
    RETURN jsonb_build_object('success', false, 'error', 'LOCK_CONFLICT');
  END;

  IF v_queue_row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLAIMED');
  END IF;

  v_verification_id := v_queue_row.verification_id;

  UPDATE open_queue_entries
  SET claimed_by = v_admin_id, claimed_at = now()
  WHERE id = p_queue_entry_id;

  UPDATE verification_assignments
  SET is_current = false, released_at = now(), release_reason = 'reassigned_via_queue_claim'
  WHERE verification_id = v_verification_id AND is_current = true;

  INSERT INTO verification_assignments (
    verification_id, assigned_admin_id, assignment_method, is_current, domain_match_score
  ) VALUES (
    v_verification_id, v_admin_id, 'OPEN_QUEUE_CLAIMED', true, 0
  );

  UPDATE platform_admin_verifications
  SET assigned_admin_id = v_admin_id,
      assignment_method = 'OPEN_QUEUE_CLAIMED',
      status = CASE WHEN status = 'Pending_Assignment' THEN 'Under_Verification' ELSE status END,
      sla_start_at = COALESCE(sla_start_at, now()),
      updated_at = now(),
      updated_by = auth.uid()
  WHERE id = v_verification_id;

  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id,
    reason, initiator
  ) VALUES (
    v_verification_id, 'CLAIMED_FROM_QUEUE', NULL, v_admin_id,
    'Claimed from open queue by ' || v_admin_name, 'admin'
  );

  UPDATE platform_admin_profiles
  SET last_assignment_timestamp = now()
  WHERE id = v_admin_id;

  RETURN jsonb_build_object(
    'success', true,
    'verification_id', v_verification_id,
    'claimed_by_name', v_admin_name
  );
END;
$$;
