-- ============================================================================
-- Foundational migration for Role-Aware Legal Acceptance
-- 1) pending_role_legal_acceptance  (signature backlog tracking)
-- 2) resolve_active_legal_template  (AGG-aware org override resolver)
-- 3) Backfill rows for currently-invited assignments
-- (assemble_role_doc + assemble_cpa interpolation will follow in a
--  separate migration once contract is finalised in code.)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) pending_role_legal_acceptance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pending_role_legal_acceptance (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  org_id        UUID NULL,
  role_code     TEXT NOT NULL,
  doc_code      TEXT NOT NULL,
  source        TEXT NOT NULL CHECK (source IN (
    'self_register','role_invite','vip_invite','provider_invite',
    'reviewer_invite','backfill'
  )),
  resolved_at   TIMESTAMPTZ NULL,
  resolved_log_id UUID NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NULL,
  UNIQUE (user_id, role_code, doc_code, org_id)
);

CREATE INDEX IF NOT EXISTS idx_prla_user_unresolved
  ON public.pending_role_legal_acceptance (user_id)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_prla_org
  ON public.pending_role_legal_acceptance (org_id)
  WHERE resolved_at IS NULL;

ALTER TABLE public.pending_role_legal_acceptance ENABLE ROW LEVEL SECURITY;

-- User can read & update only their own pending rows
CREATE POLICY "prla_select_own"
  ON public.pending_role_legal_acceptance
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "prla_update_own"
  ON public.pending_role_legal_acceptance
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Inserts performed by edge functions via service_role bypass RLS;
-- we still allow self-insert during self-register paths.
CREATE POLICY "prla_insert_self"
  ON public.pending_role_legal_acceptance
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Platform admins can read all (for dashboards / debugging)
CREATE POLICY "prla_admin_select"
  ON public.pending_role_legal_acceptance
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'platform_admin'::public.app_role));

-- ----------------------------------------------------------------------------
-- 2) resolve_active_legal_template
--   Returns the template_id (and content) to use for a given org/doc/role.
--   Rules:
--     - SPA / SKPA / CPA: org override applies only when engagement_model='AGG'
--     - PWA: org override applies for LC (R8/R9-LC) and FC (R8) ALWAYS
--            (LC/FC are seeker-org roles in MP and AGG)
--     - PWA for CU / ER: org override applies only when engagement_model='AGG'
--   Final fallback: latest active platform template from legal_document_templates.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_active_legal_template(
  p_org_id    UUID,
  p_doc_code  TEXT,
  p_role_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  template_id    UUID,
  document_code  TEXT,
  version        TEXT,
  content        TEXT,
  source         TEXT  -- 'ORG' | 'PLATFORM'
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_engagement_model TEXT;
  v_org_override_allowed BOOLEAN := FALSE;
  v_role_upper TEXT := UPPER(COALESCE(p_role_code, ''));
  v_is_lc_fc BOOLEAN;
BEGIN
  -- Determine engagement model for this org (best-effort; default MP)
  IF p_org_id IS NOT NULL THEN
    SELECT COALESCE(s.engagement_model, 'MP')
      INTO v_engagement_model
      FROM public.seeker_organizations s
     WHERE s.id = p_org_id
     LIMIT 1;
  END IF;
  v_engagement_model := COALESCE(v_engagement_model, 'MP');

  v_is_lc_fc := v_role_upper IN ('R8','R9','LC','FC');

  -- Decide whether org override is allowed
  IF p_doc_code = 'PWA' AND v_is_lc_fc THEN
    v_org_override_allowed := TRUE;       -- LC/FC always seeker-org
  ELSIF UPPER(v_engagement_model) IN ('AGG','AGGREGATOR') THEN
    v_org_override_allowed := TRUE;       -- AGG model: any doc can override
  ELSE
    v_org_override_allowed := FALSE;      -- MP: platform default for everything else
  END IF;

  -- 1) Try org override
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

  -- 2) Platform default
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

GRANT EXECUTE ON FUNCTION public.resolve_active_legal_template(UUID, TEXT, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 3) Backfill: for each currently-invited or active role assignment with no
--    legal_acceptance_log entry for the matching doc_code, insert a pending row.
--    Uses the role->doc map: R2->SKPA, R3/R4/R10_CR->SKPA,
--    R5_*->PWA, R7_*->PWA, R8->PWA (FC), R9->PWA (LC).
-- ----------------------------------------------------------------------------
INSERT INTO public.pending_role_legal_acceptance
  (user_id, org_id, role_code, doc_code, source)
SELECT DISTINCT
  ra.user_id,
  ra.org_id,
  ra.role_code,
  CASE
    WHEN ra.role_code IN ('R2')                          THEN 'SKPA'
    WHEN ra.role_code IN ('R3','R4','R10_CR','CR')       THEN 'SKPA'
    WHEN ra.role_code IN ('R5_MP','R5_AGG','CU')         THEN 'PWA'
    WHEN ra.role_code IN ('R7_MP','R7_AGG','ER')         THEN 'PWA'
    WHEN ra.role_code IN ('R8','FC')                     THEN 'PWA'
    WHEN ra.role_code IN ('R9','LC')                     THEN 'PWA'
    ELSE NULL
  END AS doc_code,
  'backfill' AS source
FROM public.role_assignments ra
WHERE ra.user_id IS NOT NULL
  AND ra.status IN ('invited','active')
  AND ra.role_code IN (
    'R2','R3','R4','R10_CR','CR',
    'R5_MP','R5_AGG','CU',
    'R7_MP','R7_AGG','ER',
    'R8','FC','R9','LC'
  )
  AND NOT EXISTS (
    SELECT 1
      FROM public.legal_acceptance_log l
     WHERE l.user_id       = ra.user_id
       AND l.document_code = CASE
         WHEN ra.role_code IN ('R2')                    THEN 'SKPA'
         WHEN ra.role_code IN ('R3','R4','R10_CR','CR') THEN 'SKPA'
         ELSE 'PWA'
       END
       AND l.action = 'accepted'
  )
ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
