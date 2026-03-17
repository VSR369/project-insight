
CREATE OR REPLACE FUNCTION public.reassign_role(
  p_challenge_id uuid,
  p_role_code text,
  p_old_user_id uuid,
  p_new_user_id uuid,
  p_reassigned_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_phase integer;
  v_phase_status text;
  v_required_role text;
  v_assign_result jsonb;
  v_sla_duration interval;
BEGIN
  -- Step 1: Get challenge phase info
  SELECT current_phase, phase_status
  INTO v_current_phase, v_phase_status
  FROM challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found: %', p_challenge_id;
  END IF;

  v_required_role := get_phase_required_role(v_current_phase);

  IF p_role_code = v_required_role AND v_phase_status = 'COMPLETED' THEN
    RAISE EXCEPTION 'Cannot reassign role for a completed phase.';
  END IF;

  -- Step 2: Revoke old user
  UPDATE user_challenge_roles
  SET is_active = false, revoked_at = now()
  WHERE user_id = p_old_user_id
    AND challenge_id = p_challenge_id
    AND role_code = p_role_code;

  -- Step 3: Validate and assign new user
  v_assign_result := assign_role_to_challenge(p_new_user_id, p_challenge_id, p_role_code, p_reassigned_by);

  -- Step 4: Reset SLA timer
  UPDATE sla_timers
  SET started_at = now(),
      deadline_at = now() + (deadline_at - started_at),
      status = 'ACTIVE',
      breached_at = null
  WHERE challenge_id = p_challenge_id
    AND phase = v_current_phase
    AND status IN ('ACTIVE', 'BREACHED');

  -- Step 5: Notify old user
  INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
  VALUES (
    p_old_user_id,
    p_challenge_id,
    'ROLE_REASSIGNED',
    'Role Reassigned',
    'Your ' || p_role_code || ' role on this challenge has been reassigned. Reason: ' || p_reason
  );

  -- Step 6: Notify new user
  INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
  VALUES (
    p_new_user_id,
    p_challenge_id,
    'ROLE_REASSIGNED',
    'Role Assigned',
    'You have been assigned the ' || p_role_code || ' role on this challenge.'
  );

  -- Step 7: Audit trail
  INSERT INTO audit_trail (challenge_id, user_id, action, method, details)
  VALUES (
    p_challenge_id,
    p_reassigned_by,
    'ROLE_REASSIGNED',
    'HUMAN',
    jsonb_build_object(
      'role', p_role_code,
      'old_user', p_old_user_id::text,
      'new_user', p_new_user_id::text,
      'reason', p_reason
    )
  );

  -- Step 8: Return
  RETURN jsonb_build_object('success', true, 'old_user', p_old_user_id::text, 'new_user', p_new_user_id::text);
END;
$$;
