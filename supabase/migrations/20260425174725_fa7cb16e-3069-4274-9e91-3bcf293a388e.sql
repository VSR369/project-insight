-- ─────────────────────────────────────────────────────────────────────────
-- 1) Fix resolve_active_legal_template — engagement model lookup
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.resolve_active_legal_template(
  p_org_id   UUID,
  p_doc_code TEXT,
  p_role_code TEXT DEFAULT NULL
)
RETURNS TABLE(
  template_id UUID,
  document_code TEXT,
  version TEXT,
  content TEXT,
  source TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_model TEXT := 'MP';
  v_org_override_allowed BOOLEAN := FALSE;
  v_role_upper TEXT := UPPER(COALESCE(p_role_code, ''));
  v_is_lc_fc BOOLEAN;
BEGIN
  -- Engagement model lives on the org's active subscription
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(em.code, 'MP')
      INTO v_engagement_model
      FROM public.seeker_subscriptions s
      LEFT JOIN public.md_engagement_models em ON em.id = s.engagement_model_id
     WHERE s.organization_id = p_org_id
     ORDER BY s.created_at DESC
     LIMIT 1;
    v_engagement_model := COALESCE(v_engagement_model, 'MP');
  END IF;

  v_is_lc_fc := v_role_upper IN ('R8','R9','LC','FC');

  IF p_doc_code = 'PWA' AND v_is_lc_fc THEN
    v_org_override_allowed := TRUE;
  ELSIF UPPER(v_engagement_model) IN ('AGG','AGGREGATOR') THEN
    v_org_override_allowed := TRUE;
  ELSE
    v_org_override_allowed := FALSE;
  END IF;

  IF v_org_override_allowed AND p_org_id IS NOT NULL THEN
    RETURN QUERY
      SELECT o.id,
             o.document_code,
             o.version,
             COALESCE(o.template_content, o.content),
             'ORG'::text
        FROM public.org_legal_document_templates o
       WHERE o.organization_id = p_org_id
         AND o.document_code   = p_doc_code
         AND o.is_active       = TRUE
       ORDER BY o.effective_date DESC NULLS LAST, o.created_at DESC
       LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  RETURN QUERY
    SELECT t.template_id,
           t.document_code,
           t.version,
           COALESCE(t.template_content, t.content),
           'PLATFORM'::text
      FROM public.legal_document_templates t
     WHERE t.document_code = p_doc_code
       AND t.is_active     = TRUE
     ORDER BY t.effective_date DESC NULLS LAST, t.created_at DESC
     LIMIT 1;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2) Helper — interpolate {{key}} → value from a JSONB map
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.interpolate_legal_vars(
  p_content TEXT,
  p_vars    JSONB
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_out TEXT := COALESCE(p_content, '');
  v_key TEXT;
  v_val TEXT;
BEGIN
  IF p_vars IS NULL OR jsonb_typeof(p_vars) <> 'object' THEN
    RETURN v_out;
  END IF;
  FOR v_key, v_val IN SELECT key, COALESCE(value #>> '{}', '') FROM jsonb_each(p_vars) LOOP
    v_out := REPLACE(v_out, '{{' || v_key || '}}', v_val);
  END LOOP;
  RETURN v_out;
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3) assemble_role_doc — server-side interpolation for SPA / SKPA / PWA
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assemble_role_doc(
  p_user_id   UUID,
  p_doc_code  TEXT,
  p_org_id    UUID DEFAULT NULL,
  p_role_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tpl       RECORD;
  v_org       RECORD;
  v_geo       RECORD;
  v_pack      RECORD;
  v_user_name TEXT := '';
  v_user_email TEXT := '';
  v_role_label TEXT := '';
  v_engagement TEXT := 'MP';
  v_vars      JSONB;
  v_content   TEXT;
BEGIN
  -- 1. Resolve template (org override or platform default)
  SELECT * INTO v_tpl
  FROM public.resolve_active_legal_template(p_org_id, p_doc_code, p_role_code);

  IF v_tpl IS NULL OR v_tpl.template_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('No active template found for doc_code=%s', p_doc_code)
    );
  END IF;

  -- 2. Org context
  IF p_org_id IS NOT NULL THEN
    SELECT * INTO v_org FROM public.seeker_organizations WHERE id = p_org_id;

    SELECT COALESCE(em.code, 'MP') INTO v_engagement
      FROM public.seeker_subscriptions s
      LEFT JOIN public.md_engagement_models em ON em.id = s.engagement_model_id
     WHERE s.organization_id = p_org_id
     ORDER BY s.created_at DESC
     LIMIT 1;
    v_engagement := COALESCE(v_engagement, 'MP');

    -- Geography (best-effort)
    BEGIN
      SELECT gc.region_name,
             array_to_string(gc.data_privacy_laws, ', ') AS privacy_laws
        INTO v_geo
        FROM public.geography_context gc
        JOIN public.countries co ON gc.country_codes @> ARRAY[co.code]
       WHERE co.id = v_org.hq_country_id
       LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      v_geo := NULL;
    END;
  END IF;

  -- 3. User identity
  SELECT COALESCE(u.raw_user_meta_data->>'first_name','') ||
         CASE WHEN u.raw_user_meta_data->>'last_name' IS NOT NULL
              THEN ' ' || (u.raw_user_meta_data->>'last_name')
              ELSE '' END,
         u.email
    INTO v_user_name, v_user_email
    FROM auth.users u
   WHERE u.id = p_user_id;

  -- 4. Role label
  v_role_label := CASE UPPER(COALESCE(p_role_code,''))
    WHEN 'R2' THEN 'Seeking Organization Admin'
    WHEN 'R3' THEN 'Challenge Creator'
    WHEN 'R4' THEN 'Challenge Creator'
    WHEN 'R10_CR' THEN 'Challenge Creator'
    WHEN 'CR' THEN 'Challenge Creator'
    WHEN 'R5_MP' THEN 'Curator'
    WHEN 'R5_AGG' THEN 'Curator'
    WHEN 'CU' THEN 'Curator'
    WHEN 'R7_MP' THEN 'Expert Reviewer'
    WHEN 'R7_AGG' THEN 'Expert Reviewer'
    WHEN 'ER' THEN 'Expert Reviewer'
    WHEN 'R8' THEN 'Finance Coordinator'
    WHEN 'FC' THEN 'Finance Coordinator'
    WHEN 'R9' THEN 'Legal Coordinator'
    WHEN 'LC' THEN 'Legal Coordinator'
    WHEN 'SP' THEN 'Solution Provider'
    ELSE COALESCE(p_role_code, '')
  END;

  -- 5. Build variable map
  v_vars := jsonb_build_object(
    'platform_name',         'CogniBlend',
    'engagement_model',      v_engagement,
    'user_full_name',        TRIM(COALESCE(v_user_name,'')),
    'user_email',            COALESCE(v_user_email,''),
    'user_role',             v_role_label,
    'acceptance_date',       to_char(now(), 'YYYY-MM-DD'),
    'seeker_org_name',       COALESCE(v_org.organization_name,''),
    'seeker_legal_entity',   COALESCE(v_org.legal_entity_name, v_org.organization_name, ''),
    'seeker_org_address',    TRIM(BOTH ', ' FROM CONCAT_WS(', ',
                                NULLIF(v_org.hq_address_line1,''),
                                NULLIF(v_org.hq_address_line2,''),
                                NULLIF(v_org.hq_city,''),
                                NULLIF(v_org.hq_postal_code,''))),
    'seeker_website',        COALESCE(v_org.website_url,''),
    'seeker_country',        COALESCE((SELECT name FROM public.countries WHERE id = v_org.hq_country_id),''),
    'seeker_registration_number', COALESCE(v_org.registration_number,''),
    'jurisdiction',          COALESCE(v_geo.region_name,'Applicable jurisdiction'),
    'governing_law',         COALESCE(v_geo.region_name,'Applicable jurisdiction'),
    'data_privacy_laws',     COALESCE(v_geo.privacy_laws,'As per applicable regulations'),
    'dispute_resolution_venue', COALESCE(v_geo.region_name,'Applicable jurisdiction')
  );

  -- 6. Substitute
  v_content := public.interpolate_legal_vars(v_tpl.content, v_vars);

  RETURN jsonb_build_object(
    'success',     true,
    'template_id', v_tpl.template_id,
    'document_code', v_tpl.document_code,
    'version',     v_tpl.version,
    'source',      v_tpl.source,
    'content',     v_content,
    'variables',   v_vars
  );
END;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4) Extend assemble_cpa with seeker_org / industry / geography / user vars
--    (in-place additive substitution; existing behaviour preserved)
-- ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.assemble_cpa(p_challenge_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_ch RECORD;
  v_org RECORD;
  v_tpl RECORD;
  v_geo_region TEXT := 'Applicable jurisdiction';
  v_geo_laws   TEXT := 'As per applicable regulations';
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
  v_user_name TEXT := '';
  v_user_email TEXT := '';
  v_industry_name TEXT := '';
  v_industry_certs TEXT := '';
  v_industry_frameworks TEXT := '';
  v_regulatory_frameworks TEXT := '';
  v_engagement TEXT := 'MP';
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

  -- Engagement model
  SELECT COALESCE(em.code, 'MP') INTO v_engagement
    FROM seeker_subscriptions s
    LEFT JOIN md_engagement_models em ON em.id = s.engagement_model_id
   WHERE s.organization_id = v_ch.organization_id
   ORDER BY s.created_at DESC
   LIMIT 1;
  v_engagement := COALESCE(v_engagement, 'MP');

  -- Geography
  BEGIN
    SELECT gc.region_name,
           array_to_string(gc.data_privacy_laws, ', ')
    INTO v_geo_region, v_geo_laws
    FROM geography_context gc
    JOIN countries co ON gc.country_codes @> ARRAY[co.code]
    WHERE co.id = v_org.hq_country_id
    LIMIT 1;
    IF v_geo_region IS NULL THEN v_geo_region := 'Applicable jurisdiction'; END IF;
    IF v_geo_laws   IS NULL THEN v_geo_laws   := 'As per applicable regulations'; END IF;
  EXCEPTION WHEN OTHERS THEN
    v_geo_region := 'Applicable jurisdiction';
    v_geo_laws := 'As per applicable regulations';
  END;

  -- Industry knowledge pack (best-effort: match by industry code/name on org/challenge)
  BEGIN
    SELECT ikp.industry_name,
           array_to_string(ikp.common_certifications, ', '),
           array_to_string(ikp.common_frameworks, ', '),
           ikp.regulatory_landscape
      INTO v_industry_name, v_industry_certs, v_industry_frameworks, v_regulatory_frameworks
      FROM industry_knowledge_packs ikp
     WHERE ikp.is_active = true
     LIMIT 1;
  EXCEPTION WHEN OTHERS THEN
    v_industry_name := '';
    v_industry_certs := '';
    v_industry_frameworks := '';
    v_regulatory_frameworks := '';
  END;

  -- User identity
  SELECT COALESCE(u.raw_user_meta_data->>'first_name','') ||
         CASE WHEN u.raw_user_meta_data->>'last_name' IS NOT NULL
              THEN ' ' || (u.raw_user_meta_data->>'last_name')
              ELSE '' END,
         u.email
    INTO v_user_name, v_user_email
    FROM auth.users u
   WHERE u.id = p_user_id;

  v_ip_clause := CASE v_ch.ip_model
    WHEN 'IP-EA'  THEN 'EXCLUSIVE ASSIGNMENT: Solver assigns all rights, title, and interest to Organization. Organization becomes sole IP owner.'
    WHEN 'IP-NEL' THEN 'NON-EXCLUSIVE LICENSE: Solver retains ownership. Organization receives a non-exclusive, royalty-free, perpetual license.'
    WHEN 'IP-EL'  THEN 'EXCLUSIVE LICENSE: Solver retains ownership. Organization receives an exclusive license. Solver may not license to others.'
    WHEN 'IP-JO'  THEN 'JOINT OWNERSHIP: Both parties share ownership equally. Either party may commercialize independently.'
    ELSE 'NO TRANSFER: Solver retains all intellectual property rights.'
  END;

  v_escrow_terms := CASE WHEN v_gov_mode = 'CONTROLLED' THEN
    'ESCROW REQUIREMENT: Organization must deposit full prize (' || COALESCE(v_ch.currency_code, 'USD') || ' ' || v_prize::text || ') into Platform escrow before solver enrollment. Released upon winner confirmation + IP agreement execution.'
  ELSE '' END;

  v_anti_disint := CASE WHEN v_ch.operating_model = 'AGG' THEN
    'ANTI-DISINTERMEDIATION: Solver agrees not to engage directly with Organization outside Platform for services related to this challenge for 12 months post-completion.'
  ELSE '' END;

  v_lc_status := CASE v_gov_mode WHEN 'QUICK' THEN 'approved' ELSE 'pending_review' END;

  v_variables := jsonb_build_object(
    -- Existing
    'challenge_title',   COALESCE(v_ch.title, ''),
    'seeker_org_name',   COALESCE(v_org.organization_name, ''),
    'ip_clause',         v_ip_clause,
    'ip_model',          COALESCE(v_ch.ip_model, ''),
    'escrow_terms',      v_escrow_terms,
    'anti_disintermediation', v_anti_disint,
    'prize_amount',      v_prize::text,
    'total_fee',         v_prize::text,
    'currency',          COALESCE(v_ch.currency_code, 'USD'),
    'jurisdiction',      v_geo_region,
    'governing_law',     v_geo_region,
    'data_privacy_laws', v_geo_laws,
    'evaluation_method', COALESCE(v_ch.evaluation_method, 'SINGLE') ||
       CASE WHEN v_ch.evaluator_count > 1 THEN ' (' || v_ch.evaluator_count::text || ' evaluators)' ELSE '' END,
    'solver_audience',   COALESCE(v_ch.solver_audience, 'ALL'),
    'governance_mode',   v_gov_mode,
    'operating_model',   COALESCE(v_ch.operating_model, ''),
    'problem_statement', COALESCE(v_ch.problem_statement, ''),
    'scope',             COALESCE(v_ch.scope, ''),
    'submission_deadline', COALESCE(v_ch.submission_deadline::text, ''),
    -- Extended
    'engagement_model',  v_engagement,
    'platform_name',     'CogniBlend',
    'seeker_legal_entity', COALESCE(v_org.legal_entity_name, v_org.organization_name, ''),
    'seeker_org_address',  TRIM(BOTH ', ' FROM CONCAT_WS(', ',
                              NULLIF(v_org.hq_address_line1,''),
                              NULLIF(v_org.hq_address_line2,''),
                              NULLIF(v_org.hq_city,''),
                              NULLIF(v_org.hq_postal_code,''))),
    'seeker_website',     COALESCE(v_org.website_url,''),
    'seeker_country',     COALESCE((SELECT name FROM countries WHERE id = v_org.hq_country_id),''),
    'seeker_registration_number', COALESCE(v_org.registration_number,''),
    'industry_name',      COALESCE(v_industry_name,''),
    'industry_certifications', COALESCE(v_industry_certs,''),
    'industry_frameworks', COALESCE(v_industry_frameworks,''),
    'regulatory_frameworks', COALESCE(v_regulatory_frameworks,''),
    'user_full_name',     TRIM(COALESCE(v_user_name,'')),
    'user_email',         COALESCE(v_user_email,''),
    'acceptance_date',    to_char(now(), 'YYYY-MM-DD')
  );

  IF v_tpl.id IS NOT NULL AND v_tpl.template_content IS NOT NULL THEN
    v_content := public.interpolate_legal_vars(v_tpl.template_content, v_variables);
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
      '8. GOVERNING LAW: ' || v_geo_region || '.';
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
