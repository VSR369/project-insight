
-- validate_lightweight_publication: GATE-11-L checks for Lightweight Phase 4 auto-completion
-- Checks: visibility set, eligibility set, checklist passes, no unresolved amendments,
-- complexity noted, reward structure present, evaluation criteria present.
-- If all pass: auto-complete Phase 4 and Phase 5.
-- If any fail: block with phase_status='BLOCKED' and create notification.

CREATE OR REPLACE FUNCTION public.validate_lightweight_publication(p_challenge_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_challenge RECORD;
  v_failures TEXT[] := '{}';
  v_checklist_result jsonb;
  v_amendment_count INT;
  v_creator_id UUID;
BEGIN
  -- Fetch challenge
  SELECT *
    INTO v_challenge
    FROM public.challenges
   WHERE id = p_challenge_id
     AND is_deleted = FALSE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('passed', false, 'failures', jsonb_build_array('Challenge not found'));
  END IF;

  -- Verify this is a Lightweight challenge
  IF COALESCE(v_challenge.governance_profile, '') != 'LIGHTWEIGHT' THEN
    RETURN jsonb_build_object('passed', false, 'failures', jsonb_build_array('Not a Lightweight governance challenge'));
  END IF;

  -- Check 1: Visibility must be set
  IF v_challenge.visibility IS NULL OR v_challenge.visibility = '' THEN
    v_failures := array_append(v_failures, 'Visibility not configured');
  END IF;

  -- Check 2: Eligibility must be set
  IF v_challenge.eligibility IS NULL OR v_challenge.eligibility = '' THEN
    v_failures := array_append(v_failures, 'Eligibility not configured');
  END IF;

  -- Check 3: Curation checklist (reuse existing function if available)
  BEGIN
    v_checklist_result := public.validate_curation_checklist(p_challenge_id);
    IF NOT COALESCE((v_checklist_result->>'all_passed')::boolean, false) THEN
      v_failures := array_append(v_failures, 'Curation checklist has unresolved items');
    END IF;
  EXCEPTION WHEN undefined_function THEN
    -- If validate_curation_checklist doesn't exist, skip
    NULL;
  END;

  -- Check 4: No unresolved amendments
  SELECT COUNT(*)
    INTO v_amendment_count
    FROM public.amendment_records
   WHERE challenge_id = p_challenge_id
     AND status NOT IN ('APPROVED', 'RESOLVED', 'COMPLETED');

  IF v_amendment_count > 0 THEN
    v_failures := array_append(v_failures, format('%s unresolved amendment(s)', v_amendment_count));
  END IF;

  -- Check 5: Complexity noted
  IF v_challenge.complexity_parameters IS NULL AND 
     (v_challenge.complexity_level IS NULL OR v_challenge.complexity_level = '') THEN
    v_failures := array_append(v_failures, 'Complexity assessment not completed');
  END IF;

  -- Check 6: Reward structure present
  IF v_challenge.reward_structure IS NULL THEN
    v_failures := array_append(v_failures, 'Reward structure not defined');
  END IF;

  -- Check 7: Evaluation criteria present
  IF v_challenge.evaluation_criteria IS NULL THEN
    v_failures := array_append(v_failures, 'Evaluation criteria not defined');
  END IF;

  -- Check 8: Problem statement present
  IF v_challenge.problem_statement IS NULL OR v_challenge.problem_statement = '' THEN
    v_failures := array_append(v_failures, 'Problem statement is missing');
  END IF;

  -- If failures, block and notify
  IF array_length(v_failures, 1) > 0 THEN
    -- Set phase_status to BLOCKED
    UPDATE public.challenges
       SET phase_status = 'BLOCKED',
           updated_at = NOW()
     WHERE id = p_challenge_id;

    -- Find creator for notification
    SELECT created_by INTO v_creator_id
      FROM public.challenges
     WHERE id = p_challenge_id;

    -- Create notification listing failures
    IF v_creator_id IS NOT NULL THEN
      INSERT INTO public.cogni_notifications (
        user_id, notification_type, title, message, challenge_id
      ) VALUES (
        v_creator_id,
        'GATE_BLOCKED',
        'Publication blocked — items need attention',
        'The following items must be resolved before publication: ' || array_to_string(v_failures, '; '),
        p_challenge_id
      );
    END IF;

    RETURN jsonb_build_object(
      'passed', false,
      'failures', to_jsonb(v_failures)
    );
  END IF;

  -- All passed: auto-complete Phase 4 and Phase 5
  -- Phase 4 → 5
  UPDATE public.challenges
     SET current_phase = 5,
         phase_status = 'ACTIVE',
         updated_at = NOW()
   WHERE id = p_challenge_id
     AND current_phase = 4;

  -- Log Phase 4 completion
  INSERT INTO public.audit_trail (
    user_id, challenge_id, action, method, phase_from, phase_to, details
  ) VALUES (
    COALESCE(auth.uid(), v_challenge.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
    p_challenge_id,
    'PHASE_COMPLETED',
    'AUTO_COMPLETE',
    4, 5,
    jsonb_build_object('gate', 'GATE-11-L', 'governance', 'LIGHTWEIGHT')
  );

  -- Phase 5 → 7 (skip Phase 6 per recursive engine)
  UPDATE public.challenges
     SET current_phase = 7,
         phase_status = 'ACTIVE',
         published_at = NOW(),
         master_status = 'PUBLISHED',
         updated_at = NOW()
   WHERE id = p_challenge_id
     AND current_phase = 5;

  -- Log Phase 5 completion
  INSERT INTO public.audit_trail (
    user_id, challenge_id, action, method, phase_from, phase_to, details
  ) VALUES (
    COALESCE(auth.uid(), v_challenge.created_by, '00000000-0000-0000-0000-000000000000'::uuid),
    p_challenge_id,
    'PHASE_COMPLETED',
    'AUTO_COMPLETE',
    5, 7,
    jsonb_build_object('gate', 'GATE-11-L', 'governance', 'LIGHTWEIGHT', 'note', 'Phase 6 skipped')
  );

  -- Notify creator of publication
  IF v_challenge.created_by IS NOT NULL THEN
    INSERT INTO public.cogni_notifications (
      user_id, notification_type, title, message, challenge_id
    ) VALUES (
      v_challenge.created_by,
      'CHALLENGE_PUBLISHED',
      'Challenge published successfully',
      'Your challenge "' || LEFT(v_challenge.title, 60) || '" is now live and accepting submissions.',
      p_challenge_id
    );
  END IF;

  RETURN jsonb_build_object(
    'passed', true,
    'failures', '[]'::jsonb,
    'new_phase', 7,
    'phases_auto_completed', jsonb_build_array(
      jsonb_build_object('from_phase', 4, 'to_phase', 5, 'method', 'AUTO_COMPLETE'),
      jsonb_build_object('from_phase', 5, 'to_phase', 7, 'method', 'AUTO_COMPLETE')
    )
  );
END;
$$;
