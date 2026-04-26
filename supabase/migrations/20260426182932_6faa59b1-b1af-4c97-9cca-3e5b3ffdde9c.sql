-- =====================================================================
-- Phase 9 v4 — Prompt 1 (retry): RA_R2 + idempotent backfill
-- =====================================================================

-- 0) Allow RA_R2 in the document_code CHECK constraint.
ALTER TABLE public.legal_document_templates
  DROP CONSTRAINT IF EXISTS legal_document_templates_document_code_check;
ALTER TABLE public.legal_document_templates
  ADD CONSTRAINT legal_document_templates_document_code_check
  CHECK (document_code = ANY (ARRAY[
    'PMA','CA','PSA','IPAA','EPIA',
    'SPA','SKPA','PWA','RA_R2',
    'CPA_QUICK','CPA_STRUCTURED','CPA_CONTROLLED'
  ]));

-- 1) Insert RA_R2 platform template placeholder (DRAFT) if missing.
INSERT INTO public.legal_document_templates (
  document_code, document_name, document_type, tier,
  version, version_status, applies_to_model, applies_to_mode,
  is_mandatory, is_active, summary, description
)
SELECT
  'RA_R2',
  'Seeker Admin Role Agreement',
  'role_agreement',
  'platform',
  '1.0',
  'DRAFT',
  'BOTH',
  'ALL',
  TRUE,
  TRUE,
  'Role agreement signed by a Seeker Organization Admin at first login, distinct from the SKPA org-platform contract.',
  'Defines the personal obligations of the individual granted the Seeker Admin (R2) role: confidentiality, conduct, fiduciary duty toward the seeker org, and platform compliance. Signed once per user, separate from SKPA.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.legal_document_templates WHERE document_code = 'RA_R2'
);

-- 2) Per-role required doc codes (SETOF allows multi-doc roles).
CREATE OR REPLACE FUNCTION public.role_required_doc_codes(p_role_code TEXT)
RETURNS SETOF TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT unnest(CASE UPPER(p_role_code)
    WHEN 'R2'      THEN ARRAY['SKPA','RA_R2']
    WHEN 'R3'      THEN ARRAY['PWA']
    WHEN 'R4'      THEN ARRAY['PWA']
    WHEN 'R10_CR'  THEN ARRAY['PWA']
    WHEN 'CR'      THEN ARRAY['PWA']
    WHEN 'R5_MP'   THEN ARRAY['PWA']
    WHEN 'R5_AGG'  THEN ARRAY['PWA']
    WHEN 'CU'      THEN ARRAY['PWA']
    WHEN 'R7_MP'   THEN ARRAY['PWA']
    WHEN 'R7_AGG'  THEN ARRAY['PWA']
    WHEN 'ER'      THEN ARRAY['PWA']
    WHEN 'R8'      THEN ARRAY['PWA']
    WHEN 'FC'      THEN ARRAY['PWA']
    WHEN 'R9'      THEN ARRAY['PWA']
    WHEN 'LC'      THEN ARRAY['PWA']
    WHEN 'SP'      THEN ARRAY['SPA']
    ELSE ARRAY[]::TEXT[]
  END);
$$;

-- 3) Helper: doc has an ACTIVE template (platform or org-scoped).
CREATE OR REPLACE FUNCTION public.has_active_legal_template(p_doc_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.legal_document_templates
     WHERE document_code = p_doc_code
       AND version_status = 'ACTIVE'
       AND is_active = TRUE
  ) OR EXISTS (
    SELECT 1 FROM public.org_legal_document_templates
     WHERE document_code = p_doc_code
       AND version_status = 'ACTIVE'
       AND is_active = TRUE
  );
$$;

-- 4) Updated role-assignment trigger fn.
CREATE OR REPLACE FUNCTION public.trg_role_assignment_create_pending_legal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_code TEXT;
BEGIN
  IF NEW.user_id IS NULL OR NEW.status NOT IN ('invited','active') THEN
    RETURN NEW;
  END IF;

  FOR v_doc_code IN SELECT public.role_required_doc_codes(NEW.role_code) LOOP
    IF NOT public.has_active_legal_template(v_doc_code) THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.legal_acceptance_log l
       WHERE l.user_id = NEW.user_id
         AND l.document_code = v_doc_code
         AND l.action = 'accepted'
    ) THEN CONTINUE; END IF;

    INSERT INTO public.pending_role_legal_acceptance
      (user_id, org_id, role_code, doc_code, source)
    VALUES
      (NEW.user_id, NEW.org_id, NEW.role_code, v_doc_code, 'role_invite')
    ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Wire the trigger on role_assignments.
DROP TRIGGER IF EXISTS trg_role_assignments_pending_legal ON public.role_assignments;
CREATE TRIGGER trg_role_assignments_pending_legal
AFTER INSERT OR UPDATE OF status, role_code ON public.role_assignments
FOR EACH ROW
EXECUTE FUNCTION public.trg_role_assignment_create_pending_legal();

-- 5) Bulk backfill — multi-doc + ACTIVE-template gate.
CREATE OR REPLACE FUNCTION public.backfill_pending_role_legal()
RETURNS TABLE(inserted_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INT := 0;
  v_skipped  INT := 0;
  r          RECORD;
  v_doc_code TEXT;
BEGIN
  FOR r IN
    SELECT ra.user_id, ra.org_id, ra.role_code
      FROM public.role_assignments ra
     WHERE ra.status = 'active' AND ra.user_id IS NOT NULL
  LOOP
    FOR v_doc_code IN SELECT public.role_required_doc_codes(r.role_code) LOOP
      IF NOT public.has_active_legal_template(v_doc_code) THEN
        v_skipped := v_skipped + 1; CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.legal_acceptance_log lal
         WHERE lal.user_id = r.user_id
           AND lal.document_code = v_doc_code
           AND lal.action = 'accepted'
      ) THEN
        v_skipped := v_skipped + 1; CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1 FROM public.pending_role_legal_acceptance pra
         WHERE pra.user_id   = r.user_id
           AND pra.doc_code  = v_doc_code
           AND pra.role_code = r.role_code
           AND COALESCE(pra.org_id::TEXT,'') = COALESCE(r.org_id::TEXT,'')
           AND pra.resolved_at IS NULL
      ) THEN
        v_skipped := v_skipped + 1; CONTINUE;
      END IF;

      INSERT INTO public.pending_role_legal_acceptance(user_id, org_id, role_code, doc_code, source)
      VALUES (r.user_id, r.org_id, r.role_code, v_doc_code, 'backfill')
      ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
      v_inserted := v_inserted + 1;
    END LOOP;
  END LOOP;

  FOR r IN
    SELECT sp.user_id, NULL::UUID AS org_id, 'SP'::TEXT AS role_code
      FROM public.solution_providers sp WHERE sp.user_id IS NOT NULL
  LOOP
    IF NOT public.has_active_legal_template('SPA') THEN
      v_skipped := v_skipped + 1; CONTINUE;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.legal_acceptance_log lal
       WHERE lal.user_id = r.user_id AND lal.document_code = 'SPA' AND lal.action = 'accepted'
    ) THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.pending_role_legal_acceptance pra
       WHERE pra.user_id = r.user_id AND pra.doc_code = 'SPA' AND pra.resolved_at IS NULL
    ) THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    INSERT INTO public.pending_role_legal_acceptance(user_id, org_id, role_code, doc_code, source)
    VALUES (r.user_id, NULL, 'SP', 'SPA', 'backfill')
    ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_skipped;
END;
$$;

-- 6) DRAFT/INSERT → ACTIVE backfill trigger on legal_document_templates.
CREATE OR REPLACE FUNCTION public.trg_legal_template_activated_backfill()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r       RECORD;
  v_match BOOLEAN;
BEGIN
  IF NEW.document_code IS NULL THEN RETURN NEW; END IF;
  IF NEW.version_status <> 'ACTIVE' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.version_status = 'ACTIVE' THEN RETURN NEW; END IF;

  FOR r IN
    SELECT ra.user_id, ra.org_id, ra.role_code
      FROM public.role_assignments ra
     WHERE ra.status IN ('invited','active') AND ra.user_id IS NOT NULL
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.role_required_doc_codes(r.role_code) AS d(code)
       WHERE d.code = NEW.document_code
    ) INTO v_match;
    IF NOT v_match THEN CONTINUE; END IF;

    IF EXISTS (
      SELECT 1 FROM public.legal_acceptance_log lal
       WHERE lal.user_id = r.user_id
         AND lal.document_code = NEW.document_code
         AND lal.action = 'accepted'
    ) THEN CONTINUE; END IF;

    INSERT INTO public.pending_role_legal_acceptance(user_id, org_id, role_code, doc_code, source)
    VALUES (r.user_id, r.org_id, r.role_code, NEW.document_code, 'template_activated')
    ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
  END LOOP;

  IF NEW.document_code = 'SPA' THEN
    FOR r IN
      SELECT sp.user_id FROM public.solution_providers sp WHERE sp.user_id IS NOT NULL
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.legal_acceptance_log lal
         WHERE lal.user_id = r.user_id AND lal.document_code = 'SPA' AND lal.action = 'accepted'
      ) THEN CONTINUE; END IF;

      INSERT INTO public.pending_role_legal_acceptance(user_id, org_id, role_code, doc_code, source)
      VALUES (r.user_id, NULL, 'SP', 'SPA', 'template_activated')
      ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_legal_template_activated ON public.legal_document_templates;
CREATE TRIGGER trg_legal_template_activated
AFTER INSERT OR UPDATE OF version_status ON public.legal_document_templates
FOR EACH ROW
EXECUTE FUNCTION public.trg_legal_template_activated_backfill();