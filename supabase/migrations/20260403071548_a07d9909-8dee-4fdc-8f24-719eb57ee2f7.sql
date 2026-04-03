
CREATE OR REPLACE FUNCTION public.complete_legal_review(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge record;
  v_has_role boolean;
  v_phase_result jsonb;
BEGIN
  -- 1. Fetch challenge
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete
    INTO v_challenge
    FROM challenges
   WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  -- 2. Verify caller has LC role
  SELECT EXISTS(
    SELECT 1 FROM user_challenge_roles
     WHERE user_id = p_user_id
       AND challenge_id = p_challenge_id
       AND role_code = 'LC'
       AND is_active = true
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have LC role on this challenge');
  END IF;

  -- 3. Verify phase = 2
  IF v_challenge.current_phase IS DISTINCT FROM 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is not in Phase 2');
  END IF;

  -- 4. Set lc_compliance_complete
  UPDATE challenges
     SET lc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  -- 5. Audit
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_user_id, p_challenge_id, 'LEGAL_REVIEW_COMPLETED', 'RPC',
          jsonb_build_object('flag', 'lc_compliance_complete', 'set_to', true));

  -- 6. If both flags TRUE, advance to Phase 3
  IF v_challenge.fc_compliance_complete = true THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object('success', true, 'phase_advanced', true, 'current_phase', 3, 'phase_result', v_phase_result);
  END IF;

  RETURN jsonb_build_object('success', true, 'phase_advanced', false, 'current_phase', 2, 'waiting_for', 'fc_compliance_complete');
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_financial_review(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge record;
  v_has_role boolean;
  v_phase_result jsonb;
BEGIN
  -- 1. Fetch challenge
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete
    INTO v_challenge
    FROM challenges
   WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  -- 2. Verify caller has FC role
  SELECT EXISTS(
    SELECT 1 FROM user_challenge_roles
     WHERE user_id = p_user_id
       AND challenge_id = p_challenge_id
       AND role_code = 'FC'
       AND is_active = true
  ) INTO v_has_role;

  IF NOT v_has_role THEN
    RETURN jsonb_build_object('success', false, 'error', 'User does not have FC role on this challenge');
  END IF;

  -- 3. Verify phase = 2
  IF v_challenge.current_phase IS DISTINCT FROM 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is not in Phase 2');
  END IF;

  -- 4. Set fc_compliance_complete
  UPDATE challenges
     SET fc_compliance_complete = true,
         updated_at = now(),
         updated_by = p_user_id
   WHERE id = p_challenge_id;

  -- 5. Audit
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_user_id, p_challenge_id, 'FINANCIAL_REVIEW_COMPLETED', 'RPC',
          jsonb_build_object('flag', 'fc_compliance_complete', 'set_to', true));

  -- 6. If both flags TRUE, advance to Phase 3
  IF v_challenge.lc_compliance_complete = true THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object('success', true, 'phase_advanced', true, 'current_phase', 3, 'phase_result', v_phase_result);
  END IF;

  RETURN jsonb_build_object('success', true, 'phase_advanced', false, 'current_phase', 2, 'waiting_for', 'lc_compliance_complete');
END;
$$;
