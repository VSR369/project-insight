-- Phase 0: Replace audit_trail.method = 'RPC' with 'HUMAN' in 5 lifecycle RPCs.
-- Rationale: audit_trail trigger validate_audit_trail_method only allows
-- HUMAN | AUTO_COMPLETE | SYSTEM. These RPCs are invoked by a user action
-- (curator/LC/FC clicking a button) so 'HUMAN' is semantically correct.
-- All function bodies otherwise unchanged.

CREATE OR REPLACE FUNCTION public.freeze_for_legal_review(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
  v_hash TEXT;
  v_hash_input TEXT;
BEGIN
  SELECT id, current_phase, curation_lock_status, title,
         problem_statement, scope, hook, ip_model, evaluation_criteria
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.current_phase IS DISTINCT FROM 2 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge must be in Phase 2 (Curation)');
  END IF;

  IF v_challenge.curation_lock_status = 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is already frozen');
  END IF;

  v_hash_input := COALESCE(v_challenge.title, '') || '|' ||
                   COALESCE(v_challenge.problem_statement, '') || '|' ||
                   COALESCE(v_challenge.scope, '') || '|' ||
                   COALESCE(v_challenge.hook, '') || '|' ||
                   COALESCE(v_challenge.ip_model, '') || '|' ||
                   COALESCE(v_challenge.evaluation_criteria::text, '');

  v_hash := encode(extensions.digest(v_hash_input::bytea, 'sha256'::text), 'hex');

  UPDATE public.challenges
  SET curation_lock_status = 'FROZEN',
      curation_frozen_at = NOW(),
      curation_frozen_by = p_user_id,
      legal_review_content_hash = v_hash,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  INSERT INTO public.audit_trail (
    action, method, user_id, challenge_id, details
  ) VALUES (
    'CURATION_FROZEN', 'HUMAN', p_user_id, p_challenge_id,
    jsonb_build_object('content_hash', v_hash, 'frozen_at', NOW()::text)
  );

  RETURN jsonb_build_object('success', true, 'content_hash', v_hash);
END;
$function$;

CREATE OR REPLACE FUNCTION public.unfreeze_for_recuration(p_challenge_id uuid, p_user_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_challenge RECORD;
BEGIN
  SELECT id, curation_lock_status
  INTO v_challenge
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF v_challenge IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  IF v_challenge.curation_lock_status != 'FROZEN' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge is not frozen');
  END IF;

  UPDATE public.challenges
  SET curation_lock_status = 'RETURNED',
      curation_frozen_at = NULL,
      curation_frozen_by = NULL,
      legal_review_content_hash = NULL,
      current_phase = 2,
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_challenge_id;

  DELETE FROM public.challenge_legal_docs
  WHERE challenge_id = p_challenge_id AND is_assembled = true;

  INSERT INTO public.audit_trail (
    action, method, user_id, challenge_id, details
  ) VALUES (
    'CURATION_UNFROZEN', 'HUMAN', p_user_id, p_challenge_id,
    jsonb_build_object('reason', COALESCE(p_reason, 'No reason provided'), 'returned_at', NOW()::text)
  );

  RETURN jsonb_build_object('success', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.assemble_cpa(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_ch RECORD;
  v_org RECORD;
  v_tpl RECORD;
  v_geo RECORD;
  v_gov_mode TEXT;
  v_cpa_code TEXT;
  v_ip_clause TEXT;
  v_escrow_terms TEXT;
  v_anti_disint TEXT;
  v_content TEXT;
  v_variables JSONB;
  v_doc_id UUID;
  v_prize NUMERIC;
  v_lc_status TEXT;
BEGIN
  SELECT c.id, c.title, c.organization_id, c.tenant_id,
    c.problem_statement, c.scope, c.ip_model, c.hook,
    c.evaluation_criteria, c.total_fee, c.currency_code,
    c.operating_model, c.evaluation_method, c.evaluator_count,
    c.solver_audience, c.submission_deadline, c.reward_structure,
    COALESCE(c.governance_mode_override, c.governance_profile, 'QUICK') AS gov_mode
  INTO v_ch
  FROM challenges c
  WHERE c.id = p_challenge_id;

  IF v_ch IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  v_gov_mode := v_ch.gov_mode;
  v_cpa_code := 'CPA_' || v_gov_mode;

  v_prize := COALESCE((v_ch.reward_structure::jsonb ->> 'platinum_award')::numeric, 0);

  IF v_prize = 0 THEN
    SELECT COALESCE(pt.fixed_amount, v_ch.total_fee, 0) INTO v_prize
    FROM challenge_prize_tiers pt
    WHERE pt.challenge_id = p_challenge_id AND pt.rank = 1
    LIMIT 1;
    IF v_prize IS NULL THEN v_prize := COALESCE(v_ch.total_fee, 0); END IF;
  END IF;

  SELECT * INTO v_org FROM seeker_organizations WHERE id = v_ch.organization_id;

  SELECT id, template_content, document_name INTO v_tpl
  FROM org_legal_document_templates
  WHERE organization_id = v_ch.organization_id
    AND document_code = v_cpa_code
    AND is_active = true
    AND version_status = 'ACTIVE'
  ORDER BY created_at DESC
  LIMIT 1;

  BEGIN
    SELECT gc.region_name,
           array_to_string(gc.data_privacy_laws, ', ') AS laws
    INTO v_geo
    FROM geography_context gc
    JOIN countries co ON gc.country_codes @> ARRAY[co.code]
    WHERE co.id = v_org.hq_country_id
    LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_geo := NULL;
  END;

  v_ip_clause := CASE v_ch.ip_model
    WHEN 'IP-EA' THEN 'EXCLUSIVE ASSIGNMENT: Solver assigns all rights, title, and interest to Organization. Organization becomes sole IP owner.'
    WHEN 'IP-NEL' THEN 'NON-EXCLUSIVE LICENSE: Solver retains ownership. Organization receives a non-exclusive, royalty-free, perpetual license.'
    WHEN 'IP-EL' THEN 'EXCLUSIVE LICENSE: Solver retains ownership. Organization receives an exclusive license. Solver may not license to others.'
    WHEN 'IP-JO' THEN 'JOINT OWNERSHIP: Both parties share ownership equally. Either party may commercialize independently.'
    ELSE 'NO TRANSFER: Solver retains all intellectual property rights.'
  END;

  v_escrow_terms := CASE WHEN v_gov_mode = 'CONTROLLED' THEN
    'ESCROW REQUIREMENT: Organization must deposit full prize (' || COALESCE(v_ch.currency_code, 'USD') || ' ' || v_prize::text || ') into Platform escrow before solver enrollment. Released upon winner confirmation + IP agreement execution.'
  ELSE '' END;

  v_anti_disint := CASE WHEN v_ch.operating_model = 'AGG' THEN
    'ANTI-DISINTERMEDIATION: Solver agrees not to engage directly with Organization outside Platform for services related to this challenge for 12 months post-completion.'
  ELSE '' END;

  v_lc_status := CASE v_gov_mode
    WHEN 'QUICK' THEN 'approved'
    ELSE 'pending_review'
  END;

  v_variables := jsonb_build_object(
    'challenge_title', COALESCE(v_ch.title, ''),
    'seeker_org_name', COALESCE(v_org.organization_name, ''),
    'ip_clause', v_ip_clause,
    'ip_model', COALESCE(v_ch.ip_model, ''),
    'escrow_terms', v_escrow_terms,
    'anti_disintermediation', v_anti_disint,
    'prize_amount', v_prize::text,
    'total_fee', v_prize::text,
    'currency', COALESCE(v_ch.currency_code, 'USD'),
    'jurisdiction', COALESCE(v_geo.region_name, 'Applicable jurisdiction'),
    'governing_law', COALESCE(v_geo.laws, 'As per applicable regulations'),
    'evaluation_method', COALESCE(v_ch.evaluation_method, 'SINGLE') ||
      CASE WHEN v_ch.evaluator_count > 1 THEN ' (' || v_ch.evaluator_count::text || ' evaluators)' ELSE '' END,
    'solver_audience', COALESCE(v_ch.solver_audience, 'ALL'),
    'governance_mode', v_gov_mode,
    'problem_statement', COALESCE(v_ch.problem_statement, ''),
    'scope', COALESCE(v_ch.scope, ''),
    'submission_deadline', COALESCE(v_ch.submission_deadline::text, '')
  );

  IF v_tpl.id IS NOT NULL AND v_tpl.template_content IS NOT NULL THEN
    v_content := v_tpl.template_content;
    v_content := REPLACE(v_content, '{{challenge_title}}', v_variables->>'challenge_title');
    v_content := REPLACE(v_content, '{{seeker_org_name}}', v_variables->>'seeker_org_name');
    v_content := REPLACE(v_content, '{{ip_clause}}', v_variables->>'ip_clause');
    v_content := REPLACE(v_content, '{{ip_model}}', v_variables->>'ip_model');
    v_content := REPLACE(v_content, '{{escrow_terms}}', v_variables->>'escrow_terms');
    v_content := REPLACE(v_content, '{{anti_disintermediation}}', v_variables->>'anti_disintermediation');
    v_content := REPLACE(v_content, '{{prize_amount}}', v_variables->>'prize_amount');
    v_content := REPLACE(v_content, '{{total_fee}}', v_variables->>'total_fee');
    v_content := REPLACE(v_content, '{{currency}}', v_variables->>'currency');
    v_content := REPLACE(v_content, '{{jurisdiction}}', v_variables->>'jurisdiction');
    v_content := REPLACE(v_content, '{{governing_law}}', v_variables->>'governing_law');
    v_content := REPLACE(v_content, '{{evaluation_method}}', v_variables->>'evaluation_method');
    v_content := REPLACE(v_content, '{{solver_audience}}', v_variables->>'solver_audience');
    v_content := REPLACE(v_content, '{{governance_mode}}', v_variables->>'governance_mode');
    v_content := REPLACE(v_content, '{{problem_statement}}', v_variables->>'problem_statement');
    v_content := REPLACE(v_content, '{{scope}}', v_variables->>'scope');
    v_content := REPLACE(v_content, '{{submission_deadline}}', v_variables->>'submission_deadline');
  ELSE
    v_content := 'CHALLENGE PARTICIPATION AGREEMENT (' || v_gov_mode || ')' || E'\n\n' ||
      'Challenge: ' || COALESCE(v_ch.title, 'Untitled') || E'\n' ||
      'Organization: ' || COALESCE(v_org.organization_name, '') || E'\n\n' ||
      '1. PARTICIPATION: Solver agrees to participate in good faith and submit original work.' || E'\n\n' ||
      '2. CONFIDENTIALITY: Solver maintains confidentiality of proprietary information.' || E'\n\n' ||
      '3. INTELLECTUAL PROPERTY: ' || v_ip_clause || E'\n\n' ||
      '4. PRIZE: ' || COALESCE(v_ch.currency_code, 'USD') || ' ' || v_prize::text || E'\n\n' ||
      CASE WHEN v_escrow_terms != '' THEN '5. ESCROW: ' || v_escrow_terms || E'\n\n' ELSE '' END ||
      CASE WHEN v_anti_disint != '' THEN '6. ANTI-DISINTERMEDIATION: ' || v_anti_disint || E'\n\n' ELSE '' END ||
      '7. EVALUATION: ' || COALESCE(v_ch.evaluation_method, 'SINGLE') || ' method.' || E'\n\n' ||
      '8. GOVERNING LAW: ' || COALESCE(v_geo.region_name, 'Applicable jurisdiction') || '.';
  END IF;

  DELETE FROM challenge_legal_docs
  WHERE challenge_id = p_challenge_id
    AND is_assembled = true
    AND document_type = v_cpa_code;

  v_doc_id := gen_random_uuid();
  INSERT INTO challenge_legal_docs (
    id, challenge_id, document_type, document_name, tier,
    content, is_assembled, assembled_from_template_id,
    assembly_variables, status, lc_status, created_by
  ) VALUES (
    v_doc_id, p_challenge_id, v_cpa_code,
    'Challenge Participation Agreement (' || v_gov_mode || ')',
    'TIER_1',
    v_content, true, v_tpl.id, v_variables,
    CASE WHEN v_gov_mode = 'QUICK' THEN 'auto_accepted' ELSE 'pending_review' END,
    v_lc_status,
    p_user_id
  );

  INSERT INTO audit_trail (action, method, user_id, challenge_id, details)
  VALUES ('CPA_ASSEMBLED', 'HUMAN', p_user_id, p_challenge_id,
    jsonb_build_object('doc_id', v_doc_id::text, 'cpa_code', v_cpa_code,
      'from_template', v_tpl.id IS NOT NULL, 'governance_mode', v_gov_mode));

  RETURN jsonb_build_object('success', true, 'doc_id', v_doc_id::text, 'cpa_code', v_cpa_code);
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_legal_review(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_challenge RECORD; v_has_role BOOLEAN; v_phase_result JSONB; v_compliance_phase INTEGER;
BEGIN
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS gov_mode
  INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF v_challenge IS NULL THEN RETURN jsonb_build_object('success',false,'error','Challenge not found'); END IF;

  SELECT phase_number INTO v_compliance_phase FROM md_lifecycle_phase_config
  WHERE governance_mode = v_challenge.gov_mode AND phase_type = 'parallel_compliance' AND is_active = true LIMIT 1;
  IF v_compliance_phase IS NULL THEN v_compliance_phase := 3; END IF;

  SELECT EXISTS(SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND role_code = 'LC' AND is_active = true) INTO v_has_role;
  IF NOT v_has_role THEN RETURN jsonb_build_object('success',false,'error','No LC role'); END IF;
  IF v_challenge.current_phase != v_compliance_phase THEN
    RETURN jsonb_build_object('success',false,'error',format('Not in compliance phase. Current: %s',v_challenge.current_phase)); END IF;

  UPDATE challenges SET lc_compliance_complete = true, updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_user_id, p_challenge_id, 'LEGAL_REVIEW_COMPLETED', 'HUMAN', jsonb_build_object('flag','lc_compliance_complete'));

  IF v_challenge.fc_compliance_complete = true THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object('success',true,'phase_advanced',true,
      'current_phase',(v_phase_result->>'current_phase')::integer,'phase_result',v_phase_result);
  END IF;
  RETURN jsonb_build_object('success',true,'phase_advanced',false,'current_phase',v_compliance_phase,'waiting_for','fc_compliance_complete');
END; $function$;

CREATE OR REPLACE FUNCTION public.complete_financial_review(p_challenge_id uuid, p_user_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_challenge RECORD; v_has_role BOOLEAN; v_phase_result JSONB; v_compliance_phase INTEGER;
BEGIN
  SELECT id, current_phase, lc_compliance_complete, fc_compliance_complete,
    COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS gov_mode
  INTO v_challenge FROM challenges WHERE id = p_challenge_id;
  IF v_challenge IS NULL THEN RETURN jsonb_build_object('success',false,'error','Challenge not found'); END IF;
  SELECT phase_number INTO v_compliance_phase FROM md_lifecycle_phase_config
  WHERE governance_mode = v_challenge.gov_mode AND phase_type = 'parallel_compliance' AND is_active = true LIMIT 1;
  IF v_compliance_phase IS NULL THEN v_compliance_phase := 3; END IF;
  SELECT EXISTS(SELECT 1 FROM user_challenge_roles
    WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND role_code = 'FC' AND is_active = true) INTO v_has_role;
  IF NOT v_has_role THEN RETURN jsonb_build_object('success',false,'error','No FC role'); END IF;
  IF v_challenge.current_phase != v_compliance_phase THEN
    RETURN jsonb_build_object('success',false,'error',format('Not in compliance phase. Current: %s',v_challenge.current_phase)); END IF;
  UPDATE challenges SET fc_compliance_complete = true, updated_at = now(), updated_by = p_user_id WHERE id = p_challenge_id;
  INSERT INTO audit_trail (user_id, challenge_id, action, method, details)
  VALUES (p_user_id, p_challenge_id, 'FINANCIAL_REVIEW_COMPLETED', 'HUMAN', jsonb_build_object('flag','fc_compliance_complete'));
  IF v_challenge.lc_compliance_complete = true THEN
    SELECT public.complete_phase(p_challenge_id, p_user_id) INTO v_phase_result;
    RETURN jsonb_build_object('success',true,'phase_advanced',true,
      'current_phase',(v_phase_result->>'current_phase')::integer,'phase_result',v_phase_result);
  END IF;
  RETURN jsonb_build_object('success',true,'phase_advanced',false,'current_phase',v_compliance_phase,'waiting_for','lc_compliance_complete');
END; $function$;