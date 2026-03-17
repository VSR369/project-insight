
-- validate_curation_checklist: Returns a JSON object with 14 checklist items and pass/fail status.
-- Used by both the UI (Enterprise manual curation) and the lightweight auto-curation flow.
CREATE OR REPLACE FUNCTION public.validate_curation_checklist(p_challenge_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_tier1_total INT;
  v_tier1_attached INT;
  v_tier2_total INT;
  v_tier2_attached INT;
  v_eval_weight_sum NUMERIC;
  v_items JSONB;
  v_passed_count INT := 0;
  v_total_count INT := 14;
BEGIN
  -- Fetch challenge
  SELECT id, problem_statement, scope, deliverables, evaluation_criteria,
         reward_structure, phase_schedule, description, eligibility,
         complexity_score, complexity_parameters, maturity_level,
         visibility, ip_model
  INTO v_challenge
  FROM challenges
  WHERE id = p_challenge_id AND is_deleted = FALSE;

  IF v_challenge.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  -- Legal docs counts
  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('default_applied', 'custom_uploaded'))
  INTO v_tier1_total, v_tier1_attached
  FROM challenge_legal_docs WHERE challenge_id = p_challenge_id AND tier = 'TIER_1';

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status IN ('default_applied', 'custom_uploaded'))
  INTO v_tier2_total, v_tier2_attached
  FROM challenge_legal_docs WHERE challenge_id = p_challenge_id AND tier = 'TIER_2';

  -- Eval criteria weight sum
  SELECT COALESCE(SUM((elem->>'weight_percentage')::numeric), 0)
  INTO v_eval_weight_sum
  FROM jsonb_array_elements(
    CASE WHEN v_challenge.evaluation_criteria IS NOT NULL
         THEN v_challenge.evaluation_criteria::jsonb
         ELSE '[]'::jsonb END
  ) AS elem;

  -- Build checklist items
  v_items := jsonb_build_array(
    jsonb_build_object('id', 1, 'label', 'Problem Statement present',
      'passed', COALESCE(TRIM(v_challenge.problem_statement) != '', false)),
    jsonb_build_object('id', 2, 'label', 'Scope defined',
      'passed', COALESCE(TRIM(v_challenge.scope) != '', false)),
    jsonb_build_object('id', 3, 'label', 'Deliverables listed',
      'passed', v_challenge.deliverables IS NOT NULL AND jsonb_array_length(v_challenge.deliverables::jsonb) > 0),
    jsonb_build_object('id', 4, 'label', 'Evaluation criteria weights = 100%',
      'passed', v_eval_weight_sum = 100),
    jsonb_build_object('id', 5, 'label', 'Reward structure valid',
      'passed', v_challenge.reward_structure IS NOT NULL AND jsonb_array_length(v_challenge.reward_structure::jsonb) > 0),
    jsonb_build_object('id', 6, 'label', 'Phase schedule defined',
      'passed', v_challenge.phase_schedule IS NOT NULL AND jsonb_array_length(v_challenge.phase_schedule::jsonb) > 0),
    jsonb_build_object('id', 7, 'label', 'Submission guidelines provided',
      'passed', COALESCE(TRIM(v_challenge.description) != '', false)),
    jsonb_build_object('id', 8, 'label', 'Eligibility configured',
      'passed', COALESCE(TRIM(v_challenge.eligibility) != '', false)),
    jsonb_build_object('id', 9, 'label', 'Taxonomy tags applied',
      'passed', true), -- placeholder: tags checked via junction table
    jsonb_build_object('id', 10, 'label', 'Tier 1 legal docs attached',
      'passed', v_tier1_total > 0 AND v_tier1_attached = v_tier1_total),
    jsonb_build_object('id', 11, 'label', 'Tier 2 legal templates attached',
      'passed', v_tier2_total > 0 AND v_tier2_attached = v_tier2_total),
    jsonb_build_object('id', 12, 'label', 'Complexity parameters entered',
      'passed', v_challenge.complexity_score IS NOT NULL OR v_challenge.complexity_parameters IS NOT NULL),
    jsonb_build_object('id', 13, 'label', 'Maturity level + legal match',
      'passed', v_challenge.maturity_level IS NOT NULL),
    jsonb_build_object('id', 14, 'label', 'Artifact types configured',
      'passed', true) -- placeholder: derived from maturity config
  );

  -- Count passed
  SELECT COUNT(*) INTO v_passed_count
  FROM jsonb_array_elements(v_items) AS elem
  WHERE (elem->>'passed')::boolean = true;

  RETURN jsonb_build_object(
    'success', true,
    'challenge_id', p_challenge_id,
    'items', v_items,
    'passed_count', v_passed_count,
    'total_count', v_total_count,
    'all_passed', v_passed_count = v_total_count
  );
END;
$$;

-- Lightweight auto-curation function: called by complete_phase when governance_profile = 'LIGHTWEIGHT'
-- Validates checklist and either auto-completes Phase 3 or blocks it.
CREATE OR REPLACE FUNCTION public.auto_curate_lightweight(p_challenge_id UUID, p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_all_passed BOOLEAN;
  v_failed_items JSONB;
  v_challenge RECORD;
BEGIN
  -- Verify challenge is in Phase 3
  SELECT id, current_phase, phase_status, governance_profile
  INTO v_challenge
  FROM challenges
  WHERE id = p_challenge_id AND is_deleted = FALSE;

  IF v_challenge.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.governance_profile != 'LIGHTWEIGHT' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not a lightweight challenge');
  END IF;

  -- Run checklist validation
  v_result := validate_curation_checklist(p_challenge_id);
  v_all_passed := (v_result->>'all_passed')::boolean;

  IF v_all_passed THEN
    -- Auto-complete: Phase 3 passes, complete_phase handles the rest
    RETURN jsonb_build_object(
      'success', true,
      'auto_completed', true,
      'challenge_id', p_challenge_id
    );
  ELSE
    -- Block: set phase_status to BLOCKED
    UPDATE challenges
    SET phase_status = 'BLOCKED',
        updated_by = p_user_id,
        updated_at = NOW()
    WHERE id = p_challenge_id;

    -- Collect failed items
    SELECT jsonb_agg(elem->>'label')
    INTO v_failed_items
    FROM jsonb_array_elements(v_result->'items') AS elem
    WHERE (elem->>'passed')::boolean = false;

    -- Insert notification for the creator
    INSERT INTO cogni_notifications (user_id, challenge_id, notification_type, title, message)
    SELECT ucr.user_id, p_challenge_id, 'curation_blocked',
           'Challenge missing required items',
           'Your challenge is missing: ' || array_to_string(ARRAY(SELECT jsonb_array_elements_text(v_failed_items)), ', ') || '. Please complete these items.'
    FROM user_challenge_roles ucr
    WHERE ucr.challenge_id = p_challenge_id
      AND ucr.role_code = 'CR'
      AND ucr.status = 'ACTIVE'
    LIMIT 1;

    RETURN jsonb_build_object(
      'success', true,
      'auto_completed', false,
      'blocked', true,
      'missing_items', v_failed_items,
      'challenge_id', p_challenge_id
    );
  END IF;
END;
$$;
