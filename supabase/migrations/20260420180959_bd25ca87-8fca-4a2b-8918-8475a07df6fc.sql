-- ============================================================
-- Unified Legal Document Workflow (Pass 3 single source of truth)
-- ============================================================

-- A1: Add source_origin tracking column
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS source_origin TEXT
    CHECK (source_origin IN ('creator','curator','lc','platform_template'));

-- A2: Trigger function — mark Pass 3 stale when any non-UNIFIED_SPA row changes
CREATE OR REPLACE FUNCTION public.fn_mark_pass3_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.document_type <> 'UNIFIED_SPA' THEN
    UPDATE public.challenges
    SET pass3_stale = true
    WHERE id = NEW.challenge_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_source_marks_pass3_stale ON public.challenge_legal_docs;
CREATE TRIGGER trg_legal_source_marks_pass3_stale
  AFTER INSERT OR UPDATE ON public.challenge_legal_docs
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_mark_pass3_stale();

-- A3: DEV cleanup — remove all legacy individual document rows
DELETE FROM public.challenge_legal_docs
WHERE document_type NOT IN ('UNIFIED_SPA','SOURCE_DOC');

-- A4: Update seed_default_legal_docs RPC to insert SOURCE_DOC + platform_template
CREATE OR REPLACE FUNCTION public.seed_default_legal_docs(
  p_challenge_id uuid,
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id        uuid;
  v_engagement    text;
  v_inserted      int := 0;
  v_actor         uuid;
BEGIN
  v_actor := COALESCE(p_user_id, auth.uid());

  SELECT organization_id, COALESCE(operating_model, 'IP')
    INTO v_org_id, v_engagement
  FROM public.challenges
  WHERE id = p_challenge_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Challenge not found');
  END IF;

  -- AGG path: prefer org-specific templates if any
  IF v_engagement = 'AGG' AND v_org_id IS NOT NULL THEN
    INSERT INTO public.challenge_legal_docs (
      challenge_id, document_type, document_name, tier,
      status, lc_status, priority, rationale, content_summary, content_html,
      source_origin, created_by, attached_by, assembled_from_template_id
    )
    SELECT
      p_challenge_id,
      'SOURCE_DOC',
      COALESCE(t.document_name, COALESCE(t.document_code, t.document_type)),
      t.tier,
      'uploaded',
      'pending',
      CASE WHEN t.is_mandatory THEN 'required' ELSE 'recommended' END,
      'Default ' || t.tier || ' template for your organization.',
      COALESCE(t.summary, t.description, ''),
      NULL,
      'platform_template',
      v_actor,
      v_actor,
      t.id
    FROM public.org_legal_document_templates t
    WHERE t.organization_id = v_org_id
      AND t.is_active = true
      AND t.version_status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_legal_docs c
        WHERE c.challenge_id = p_challenge_id
          AND c.document_name = COALESCE(t.document_name, COALESCE(t.document_code, t.document_type))
          AND c.document_type = 'SOURCE_DOC'
      );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  -- Platform fallback
  IF v_inserted = 0 THEN
    INSERT INTO public.challenge_legal_docs (
      challenge_id, document_type, document_name, tier,
      status, lc_status, priority, rationale, content_summary, content_html,
      source_origin, created_by, attached_by, assembled_from_template_id
    )
    SELECT
      p_challenge_id,
      'SOURCE_DOC',
      COALESCE(t.document_name, COALESCE(t.document_code, t.document_type)),
      COALESCE(t.tier, 'TIER_1'),
      'uploaded',
      'pending',
      CASE WHEN COALESCE(t.is_mandatory, false) THEN 'required' ELSE 'recommended' END,
      'Default platform template — Pass 3 will merge this into the unified agreement.',
      COALESCE(t.summary, t.description, ''),
      NULL,
      'platform_template',
      v_actor,
      v_actor,
      t.template_id
    FROM public.legal_document_templates t
    WHERE t.is_active = true
      AND t.version_status = 'ACTIVE'
      AND NOT EXISTS (
        SELECT 1 FROM public.challenge_legal_docs c
        WHERE c.challenge_id = p_challenge_id
          AND c.document_name = COALESCE(t.document_name, COALESCE(t.document_code, t.document_type))
          AND c.document_type = 'SOURCE_DOC'
      );
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object(
    'success',  true,
    'inserted', v_inserted,
    'engagement', v_engagement
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.seed_default_legal_docs(uuid, uuid) TO authenticated;