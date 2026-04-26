-- ─────────────────────────────────────────────────────────────────────────
-- Phase 1.1: Hotfix assemble_role_doc — replace v_geo RECORD with scalar
-- TEXT vars (mirrors the working pattern already used in assemble_cpa).
-- This eliminates the 'record "v_geo" is not assigned yet' runtime error
-- that was freezing RoleLegalGate in a loading loop for users whose org
-- had no resolvable geography_context row.
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
  v_tpl         RECORD;
  v_org         RECORD;
  v_geo_region  TEXT := 'Applicable jurisdiction';
  v_geo_laws    TEXT := 'As per applicable regulations';
  v_user_name   TEXT := '';
  v_user_email  TEXT := '';
  v_role_label  TEXT := '';
  v_engagement  TEXT := 'MP';
  v_vars        JSONB;
  v_content     TEXT;
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

  -- 2. Org context (best-effort — defaults already safe if org missing)
  IF p_org_id IS NOT NULL THEN
    SELECT * INTO v_org FROM public.seeker_organizations WHERE id = p_org_id;

    SELECT COALESCE(em.code, 'MP') INTO v_engagement
      FROM public.seeker_subscriptions s
      LEFT JOIN public.md_engagement_models em ON em.id = s.engagement_model_id
     WHERE s.organization_id = p_org_id
     ORDER BY s.created_at DESC
     LIMIT 1;
    v_engagement := COALESCE(v_engagement, 'MP');

    -- Geography (best-effort, scalar vars with safe defaults)
    BEGIN
      SELECT gc.region_name,
             COALESCE(array_to_string(gc.data_privacy_laws, ', '),
                      'As per applicable regulations')
        INTO v_geo_region, v_geo_laws
        FROM public.geography_context gc
        JOIN public.countries co ON gc.country_codes @> ARRAY[co.code]
       WHERE co.id = v_org.hq_country_id
       LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- defaults already initialised; nothing to do
      NULL;
    END;

    -- Belt-and-braces: if SELECT returned NULLs, restore defaults
    v_geo_region := COALESCE(NULLIF(v_geo_region, ''), 'Applicable jurisdiction');
    v_geo_laws   := COALESCE(NULLIF(v_geo_laws, ''),   'As per applicable regulations');
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

  -- 5. Build variable map (scalar vars are NULL-safe)
  v_vars := jsonb_build_object(
    'platform_name',         'CogniBlend',
    'engagement_model',      v_engagement,
    'user_full_name',        TRIM(COALESCE(v_user_name,'')),
    'user_email',            COALESCE(v_user_email,''),
    'user_role',             v_role_label,
    'role_code',             COALESCE(p_role_code, ''),
    'role_label',            v_role_label,
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
    'jurisdiction',          v_geo_region,
    'governing_law',         v_geo_region,
    'data_privacy_laws',     v_geo_laws,
    'dispute_resolution_venue', v_geo_region
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
-- Phase 1.2: Deactivate ghost trigger_config rows referencing archived
-- legacy doc codes (PMA, CA, PSA, IPAA, EPIA). The admin Legal Templates
-- UI filters by is_active = true and will stop listing these. Templates
-- themselves remain in legal_document_templates with status ARCHIVED for
-- audit/forensic reconstruction.
-- ─────────────────────────────────────────────────────────────────────────
UPDATE public.legal_doc_trigger_config
   SET is_active = false,
       updated_at = NOW()
 WHERE document_code IN ('PMA', 'CA', 'PSA', 'IPAA', 'EPIA')
   AND is_active = true;