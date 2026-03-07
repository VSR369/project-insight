
-- GAP: Atomic verification action RPC (Approve/Reject/Return)
CREATE OR REPLACE FUNCTION public.complete_verification_action(
  p_verification_id UUID,
  p_action TEXT,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_admin_id UUID;
  v_admin_name TEXT;
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Get caller identity
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM platform_admin_profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_NOT_FOUND');
  END IF;

  -- Validate action
  IF p_action NOT IN ('Approved', 'Rejected', 'Returned_for_Correction') THEN
    RETURN jsonb_build_object('success', false, 'error', 'INVALID_ACTION');
  END IF;

  -- 1. Update verification status
  UPDATE platform_admin_verifications
  SET status = p_action,
      updated_at = v_now,
      updated_by = v_user_id,
      completed_at = CASE WHEN p_action IN ('Approved', 'Rejected') THEN v_now ELSE NULL END,
      completed_by_admin_id = CASE WHEN p_action IN ('Approved', 'Rejected') THEN v_admin_id ELSE NULL END
  WHERE id = p_verification_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'VERIFICATION_NOT_FOUND');
  END IF;

  -- 2. Close current assignment on terminal actions
  IF p_action IN ('Approved', 'Rejected') THEN
    UPDATE verification_assignments
    SET is_current = false,
        released_at = v_now,
        release_reason = lower(p_action)
    WHERE verification_id = p_verification_id
      AND is_current = true;
  END IF;

  -- 3. Insert audit log
  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, initiator, reason
  ) VALUES (
    p_verification_id,
    upper(p_action),
    v_admin_id,
    COALESCE(v_admin_name, 'system'),
    COALESCE(p_notes, 'Verification ' || lower(p_action))
  );

  RETURN jsonb_build_object('success', true);
END;
$$;

-- GAP: Server-side reassignment request with supervisor notification
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
  v_user_id UUID;
  v_admin_id UUID;
  v_admin_name TEXT;
  v_sup RECORD;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'UNAUTHORIZED');
  END IF;

  SELECT id, full_name INTO v_admin_id, v_admin_name
  FROM platform_admin_profiles
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_admin_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ADMIN_NOT_FOUND');
  END IF;

  -- Log the request
  INSERT INTO verification_assignment_log (
    verification_id, event_type, from_admin_id, to_admin_id, initiator, reason
  ) VALUES (
    p_verification_id,
    'REASSIGNMENT_REQUESTED',
    v_admin_id,
    p_target_admin_id,
    COALESCE(v_admin_name, 'system'),
    p_reason
  );

  -- Notify all supervisors
  FOR v_sup IN
    SELECT id FROM platform_admin_profiles
    WHERE admin_tier = 'supervisor' OR is_supervisor = true
  LOOP
    INSERT INTO admin_notifications (admin_id, type, title, body, deep_link)
    VALUES (
      v_sup.id,
      'REASSIGNMENT_REQUEST',
      'Reassignment Requested',
      COALESCE(v_admin_name, 'An admin') || ' has requested reassignment. Reason: ' || p_reason,
      '/admin/verifications/' || p_verification_id
    );
  END LOOP;

  RETURN jsonb_build_object('success', true);
END;
$$;
