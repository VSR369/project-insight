
-- ─────────────────────────────────────────────────────────────────────────
-- Phase 9 v4 — Prompt 3
-- AGG-Quick CPA resolver + tightened legal-template health check
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Add expires_at to platform + org legal template tables
ALTER TABLE public.legal_document_templates
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE public.org_legal_document_templates
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

COMMENT ON COLUMN public.legal_document_templates.expires_at IS
  'Optional hard end-of-life. A template is "effective-active" only when version_status=ACTIVE AND (effective_date IS NULL OR effective_date <= now()) AND (expires_at IS NULL OR expires_at > now()).';

-- 2) resolve_quick_cpa_template — engagement-model-aware Quick CPA resolver
CREATE OR REPLACE FUNCTION public.resolve_quick_cpa_template(
  p_org_id           UUID,
  p_engagement_model TEXT
)
RETURNS TABLE(
  template_id   UUID,
  document_code TEXT,
  version       TEXT,
  content       TEXT,
  source        TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_model TEXT := UPPER(COALESCE(p_engagement_model, 'MP'));
BEGIN
  -- AGG: prefer org template
  IF v_model IN ('AGG', 'AGGREGATOR') AND p_org_id IS NOT NULL THEN
    RETURN QUERY
      SELECT o.id,
             o.document_code,
             o.version,
             COALESCE(o.template_content, NULL::text),
             'ORG'::text
        FROM public.org_legal_document_templates o
       WHERE o.organization_id = p_org_id
         AND o.document_code   = 'CPA_QUICK'
         AND o.is_active       = TRUE
         AND COALESCE(o.version_status, 'ACTIVE') = 'ACTIVE'
         AND (o.effective_date IS NULL OR o.effective_date <= CURRENT_DATE)
         AND (o.expires_at     IS NULL OR o.expires_at     > now())
       ORDER BY o.effective_date DESC NULLS LAST, o.created_at DESC
       LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- MP, or AGG with missing org template → platform fallback
  RETURN QUERY
    SELECT t.template_id,
           t.document_code,
           t.version,
           COALESCE(t.template_content, t.content),
           'PLATFORM_FALLBACK'::text
      FROM public.legal_document_templates t
     WHERE t.document_code = 'CPA_QUICK'
       AND t.is_active     = TRUE
       AND t.version_status = 'ACTIVE'
       AND (t.effective_date IS NULL OR t.effective_date <= CURRENT_DATE)
       AND (t.expires_at     IS NULL OR t.expires_at     > now())
     ORDER BY t.effective_date DESC NULLS LAST, t.created_at DESC
     LIMIT 1;
END;
$$;

GRANT EXECUTE ON FUNCTION public.resolve_quick_cpa_template(UUID, TEXT) TO authenticated;

-- 3) legal_template_health — admin health probe
CREATE OR REPLACE FUNCTION public.legal_template_health()
RETURNS TABLE(
  document_code TEXT,
  is_healthy    BOOLEAN,
  template_id   UUID,
  version       TEXT,
  version_status TEXT,
  effective_date DATE,
  expires_at    TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_codes TEXT[] := ARRAY['SPA','SKPA','PWA','RA_R2','CPA_QUICK','CPA_STRUCTURED','CPA_CONTROLLED'];
  v_code  TEXT;
  v_row   RECORD;
BEGIN
  FOREACH v_code IN ARRAY v_codes LOOP
    SELECT t.template_id, t.version, t.version_status, t.effective_date, t.expires_at
      INTO v_row
      FROM public.legal_document_templates t
     WHERE t.document_code  = v_code
       AND t.is_active      = TRUE
       AND t.version_status = 'ACTIVE'
       AND (t.effective_date IS NULL OR t.effective_date <= CURRENT_DATE)
       AND (t.expires_at     IS NULL OR t.expires_at     > now())
     ORDER BY t.effective_date DESC NULLS LAST, t.created_at DESC
     LIMIT 1;

    document_code  := v_code;
    is_healthy     := v_row.template_id IS NOT NULL;
    template_id    := v_row.template_id;
    version        := v_row.version;
    version_status := v_row.version_status;
    effective_date := v_row.effective_date;
    expires_at     := v_row.expires_at;
    RETURN NEXT;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.legal_template_health() TO authenticated;
