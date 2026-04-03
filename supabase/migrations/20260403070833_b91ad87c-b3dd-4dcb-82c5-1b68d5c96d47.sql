
-- complete_legal_review: sets lc_compliance_complete and optionally advances phase
CREATE OR REPLACE FUNCTION public.complete_legal_review(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_phase_result JSONB;
BEGIN
  -- 1. Fetch challenge
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete
    INTO v_challenge
    FROM challenges
   WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.current_phase != 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Challenge is at phase %s, expected phase 2', v_challenge.current_phase)
    );
  END IF;

  -- 2. Set lc_compliance_complete = TRUE
  UPDATE challenges
     SET lc_compliance_complete = TRUE,
         updated_by = p_user_id,
         updated_at = NOW()
   WHERE id = p_challenge_id;

  -- 3. Log audit
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id,
    p_challenge_id,
    'LEGAL_REVIEW_COMPLETE',
    'RPC',
    jsonb_build_object('set_flag', 'lc_compliance_complete', 'fc_complete', v_challenge.fc_compliance_complete)
  );

  -- 4. Check if both flags are now TRUE → advance
  IF v_challenge.fc_compliance_complete = TRUE THEN
    -- Both complete, advance via complete_phase
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object(
      'success', true,
      'advanced', true,
      'current_phase', 3,
      'message', 'Both compliance flags set — advanced to Phase 3',
      'phase_result', v_phase_result
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'advanced', false,
      'current_phase', 2,
      'message', 'Legal review complete — waiting for financial compliance'
    );
  END IF;
END;
$$;

-- complete_financial_review: sets fc_compliance_complete and optionally advances phase
CREATE OR REPLACE FUNCTION public.complete_financial_review(
  p_challenge_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_phase_result JSONB;
BEGIN
  -- 1. Fetch challenge
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete
    INTO v_challenge
    FROM challenges
   WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.current_phase != 2 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Challenge is at phase %s, expected phase 2', v_challenge.current_phase)
    );
  END IF;

  -- 2. Set fc_compliance_complete = TRUE
  UPDATE challenges
     SET fc_compliance_complete = TRUE,
         updated_by = p_user_id,
         updated_at = NOW()
   WHERE id = p_challenge_id;

  -- 3. Log audit
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id,
    p_challenge_id,
    'FINANCIAL_REVIEW_COMPLETE',
    'RPC',
    jsonb_build_object('set_flag', 'fc_compliance_complete', 'lc_complete', v_challenge.lc_compliance_complete)
  );

  -- 4. Check if both flags are now TRUE → advance
  IF v_challenge.lc_compliance_complete = TRUE THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object(
      'success', true,
      'advanced', true,
      'current_phase', 3,
      'message', 'Both compliance flags set — advanced to Phase 3',
      'phase_result', v_phase_result
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'advanced', false,
      'current_phase', 2,
      'message', 'Financial review complete — waiting for legal compliance'
    );
  END IF;
END;
$$;
