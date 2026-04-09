
CREATE OR REPLACE FUNCTION public.assemble_cpa(
  p_challenge_id UUID,
  p_user_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Prize: try platinum_award from reward_structure JSONB first
  v_prize := COALESCE((v_ch.reward_structure::jsonb ->> 'platinum_award')::numeric, 0);

  -- Fall back to prize tiers if platinum_award is 0
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
  VALUES ('CPA_ASSEMBLED', 'RPC', p_user_id, p_challenge_id,
    jsonb_build_object('doc_id', v_doc_id::text, 'cpa_code', v_cpa_code,
      'from_template', v_tpl.id IS NOT NULL, 'governance_mode', v_gov_mode));

  RETURN jsonb_build_object('success', true, 'doc_id', v_doc_id::text, 'cpa_code', v_cpa_code);
END;
$$;
