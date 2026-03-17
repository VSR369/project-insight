
CREATE OR REPLACE FUNCTION public.assign_role_to_challenge(
  p_user_id uuid,
  p_challenge_id uuid,
  p_role_code text,
  p_assigned_by uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_governance_profile text;
  v_validation jsonb;
BEGIN
  -- Step 1: Get governance_profile from challenges
  SELECT governance_profile INTO v_governance_profile
  FROM challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Challenge not found: %', p_challenge_id;
  END IF;

  -- Step 2: Validate role assignment
  v_validation := validate_role_assignment(p_user_id, p_challenge_id, p_role_code, COALESCE(v_governance_profile, 'LIGHTWEIGHT'));

  -- Step 3: HARD_BLOCK → raise exception
  IF (v_validation->>'allowed')::boolean = false THEN
    RAISE EXCEPTION '%', v_validation->>'message';
  END IF;

  -- Step 4: Upsert into user_challenge_roles
  INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, assigned_by, is_active, auto_assigned)
  VALUES (p_user_id, p_challenge_id, p_role_code, p_assigned_by, true, false)
  ON CONFLICT (user_id, challenge_id, role_code)
  DO UPDATE SET is_active = true, revoked_at = null, assigned_at = now();

  -- Step 5: Audit trail
  INSERT INTO audit_trail (challenge_id, user_id, action, method, details)
  VALUES (
    p_challenge_id,
    p_assigned_by,
    'ROLE_ASSIGNED',
    'HUMAN',
    jsonb_build_object('role', p_role_code, 'assigned_to', p_user_id::text, 'conflict_warning', v_validation->>'message')
  );

  -- Step 6: Return success
  RETURN jsonb_build_object('success', true, 'conflict_warning', v_validation->>'message');
END;
$$;
