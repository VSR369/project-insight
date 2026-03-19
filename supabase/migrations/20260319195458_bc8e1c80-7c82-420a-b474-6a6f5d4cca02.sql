-- Fix: Replace invalid 'USER' method with 'HUMAN' in initialize_challenge and submit_question

CREATE OR REPLACE FUNCTION public.initialize_challenge(p_org_id uuid, p_creator_id uuid, p_title text, p_operating_model text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge_id   UUID;
  v_tenant_id      UUID;
  v_governance     TEXT;
  v_tier_check     JSONB;
  v_allowed        BOOLEAN;
  v_is_agg         BOOLEAN;
  v_start_phase    INTEGER;
BEGIN
  SELECT result INTO v_tier_check
  FROM (
    SELECT public.check_tier_limit(p_org_id) AS result
  ) sub;

  v_allowed := (v_tier_check ->> 'allowed')::boolean;

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Tier limit reached. Cannot create new challenge. %',
      COALESCE(v_tier_check ->> 'reason', 'Max active challenges reached.');
  END IF;

  SELECT id, governance_profile
    INTO v_tenant_id, v_governance
    FROM public.seeker_organizations
   WHERE id = p_org_id;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Organization not found: %', p_org_id;
  END IF;

  v_governance := COALESCE(v_governance, 'ENTERPRISE');
  v_is_agg := (p_operating_model = 'AGG');

  INSERT INTO public.challenges (
    tenant_id, organization_id, title, operating_model,
    governance_profile, status, master_status, current_phase,
    created_by, is_active, is_deleted
  ) VALUES (
    v_tenant_id, p_org_id, p_title, p_operating_model,
    v_governance, 'draft', 'IN_PREPARATION',
    CASE WHEN v_is_agg THEN 2 ELSE 1 END,
    p_creator_id, true, false
  )
  RETURNING id INTO v_challenge_id;

  INSERT INTO public.audit_trail (
    user_id, challenge_id, action, method, details
  ) VALUES (
    p_creator_id, v_challenge_id, 'CHALLENGE_CREATED', 'HUMAN',
    jsonb_build_object(
      'operating_model', p_operating_model,
      'governance_profile', v_governance,
      'organization_id', p_org_id
    )
  );

  BEGIN
    PERFORM public.auto_assign_roles_on_creation(
      v_challenge_id, p_creator_id, v_governance, p_operating_model
    );
  EXCEPTION WHEN undefined_function THEN
    NULL;
  END;

  IF v_is_agg THEN
    BEGIN
      PERFORM public.handle_phase1_bypass(v_challenge_id);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END IF;

  v_start_phase := CASE WHEN v_is_agg THEN 2 ELSE 1 END;

  BEGIN
    INSERT INTO public.sla_timers (
      challenge_id, phase, started_at, tenant_id, created_by
    ) VALUES (
      v_challenge_id, v_start_phase, NOW(), v_tenant_id, p_creator_id
    );

    INSERT INTO public.audit_trail (
      user_id, challenge_id, action, method, details
    ) VALUES (
      p_creator_id, v_challenge_id, 'SLA_STARTED', 'SYSTEM',
      jsonb_build_object('phase', v_start_phase)
    );
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;

  RETURN v_challenge_id;
END;
$function$;


CREATE OR REPLACE FUNCTION public.submit_question(p_challenge_id uuid, p_user_id uuid, p_question_text text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_qa_id UUID;
  v_anon_id TEXT;
  v_solver_index INT;
  v_challenge_title TEXT;
  v_operating_model TEXT;
  v_target_role TEXT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_solver_index
  FROM (
    SELECT DISTINCT asked_by
    FROM public.challenge_qa
    WHERE challenge_id = p_challenge_id
      AND asked_by != p_user_id
  ) sub;

  SELECT anonymous_id INTO v_anon_id
  FROM public.challenge_qa
  WHERE challenge_id = p_challenge_id
    AND asked_by = p_user_id
  LIMIT 1;

  IF v_anon_id IS NULL THEN
    v_anon_id := 'Solver-' || chr(64 + v_solver_index);
  END IF;

  INSERT INTO public.challenge_qa (
    challenge_id, asked_by, question_text, anonymous_id, created_by
  ) VALUES (
    p_challenge_id, p_user_id, p_question_text, v_anon_id, p_user_id
  ) RETURNING qa_id INTO v_qa_id;

  SELECT title, operating_model
  INTO v_challenge_title, v_operating_model
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_operating_model = 'MP' THEN
    v_target_role := 'CU';
  ELSE
    v_target_role := 'CR';
  END IF;

  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message)
  SELECT
    ucr.user_id,
    p_challenge_id,
    'QA_QUESTION_SUBMITTED',
    'New Q&A Question',
    'A new question has been submitted for "' || COALESCE(v_challenge_title, 'Unknown') || '" by ' || v_anon_id || '.'
  FROM public.user_challenge_roles ucr
  WHERE ucr.challenge_id = p_challenge_id
    AND ucr.role_code = v_target_role
    AND ucr.is_active = true;

  INSERT INTO public.audit_trail (user_id, challenge_id, action, method, details)
  VALUES (
    p_user_id,
    p_challenge_id,
    'QA_QUESTION_SUBMITTED',
    'HUMAN',
    jsonb_build_object(
      'qa_id', v_qa_id,
      'anonymous_id', v_anon_id,
      'question_preview', left(p_question_text, 100)
    )
  );

  RETURN v_qa_id;
END;
$function$;