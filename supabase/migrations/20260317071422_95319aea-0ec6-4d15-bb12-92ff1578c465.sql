
CREATE OR REPLACE FUNCTION public.validate_role_assignment(
  p_user_id uuid,
  p_challenge_id uuid,
  p_new_role text,
  p_governance_profile text
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_roles text[];
  v_role text;
  v_conflict record;
BEGIN
  -- Step 1: Get existing active roles for this user on this challenge
  SELECT array_agg(role_code) INTO v_existing_roles
  FROM user_challenge_roles
  WHERE user_id = p_user_id
    AND challenge_id = p_challenge_id
    AND is_active = true;

  -- No existing roles means no conflict possible
  IF v_existing_roles IS NULL THEN
    RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
  END IF;

  -- Step 2: Loop each existing role and check role_conflict_rules
  FOREACH v_role IN ARRAY v_existing_roles LOOP
    SELECT conflict_type, governance_profile AS rule_profile
    INTO v_conflict
    FROM role_conflict_rules
    WHERE ((role_a = v_role AND role_b = p_new_role)
        OR (role_a = p_new_role AND role_b = v_role))
      AND applies_scope = 'SAME_CHALLENGE'
      AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
      CONTINUE;
    END IF;

    -- Step 3: HARD_BLOCK
    IF v_conflict.conflict_type = 'HARD_BLOCK' THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'conflict_type', 'HARD_BLOCK',
        'message', 'User holds ' || v_role || ' and cannot also hold ' || p_new_role || ' on the same challenge.'
      );
    END IF;

    -- Step 4: SOFT_WARN with ENTERPRISE governance
    IF v_conflict.conflict_type = 'SOFT_WARN'
       AND v_conflict.rule_profile IN ('BOTH', 'ENTERPRISE_ONLY')
       AND p_governance_profile = 'ENTERPRISE' THEN
      RETURN jsonb_build_object(
        'allowed', true,
        'conflict_type', 'SOFT_WARN',
        'message', 'User holds both ' || v_role || ' and ' || p_new_role || '. Org Admin must acknowledge reduced governance.'
      );
    END IF;

    -- Step 5: SOFT_WARN with LIGHTWEIGHT governance treated as ALLOWED
    IF v_conflict.conflict_type = 'SOFT_WARN'
       AND p_governance_profile = 'LIGHTWEIGHT' THEN
      RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
    END IF;
  END LOOP;

  -- Step 6: No conflicts found
  RETURN jsonb_build_object('allowed', true, 'conflict_type', 'ALLOWED', 'message', null);
END;
$$;
