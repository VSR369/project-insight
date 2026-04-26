-- ============================================================================
-- Phase 3 — Role-grant legal mapping correction
-- ============================================================================

-- 1) Fix the trigger function — Creator now maps to PWA
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

  v_doc_code := CASE
    WHEN NEW.role_code IN ('R2')                          THEN 'SKPA'
    WHEN NEW.role_code IN ('R3','R4','R10_CR','CR')       THEN 'PWA'
    WHEN NEW.role_code IN ('R5_MP','R5_AGG','CU')         THEN 'PWA'
    WHEN NEW.role_code IN ('R7_MP','R7_AGG','ER')         THEN 'PWA'
    WHEN NEW.role_code IN ('R8','FC')                     THEN 'PWA'
    WHEN NEW.role_code IN ('R9','LC')                     THEN 'PWA'
    ELSE NULL
  END;

  IF v_doc_code IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.legal_acceptance_log l
     WHERE l.user_id = NEW.user_id
       AND l.document_code = v_doc_code
       AND l.action = 'accepted'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.pending_role_legal_acceptance
    (user_id, org_id, role_code, doc_code, source)
  VALUES
    (NEW.user_id, NEW.org_id, NEW.role_code, v_doc_code, 'role_invite')
  ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 2) Repair existing wrong rows (CR-family pointing at SKPA -> PWA)
INSERT INTO public.pending_role_legal_acceptance
  (user_id, org_id, role_code, doc_code, source)
SELECT user_id, org_id, role_code, 'PWA', 'role_invite'
  FROM public.pending_role_legal_acceptance
 WHERE doc_code = 'SKPA'
   AND role_code IN ('R3','R4','R10_CR','CR')
   AND resolved_at IS NULL
ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;

DELETE FROM public.pending_role_legal_acceptance
 WHERE doc_code = 'SKPA'
   AND role_code IN ('R3','R4','R10_CR','CR')
   AND resolved_at IS NULL;

-- 3) Backfill missing R2 SKPA pending rows
INSERT INTO public.pending_role_legal_acceptance
  (user_id, org_id, role_code, doc_code, source)
SELECT ra.user_id, ra.org_id, ra.role_code, 'SKPA', 'backfill'
  FROM public.role_assignments ra
 WHERE ra.role_code = 'R2'
   AND ra.status IN ('active','invited')
   AND ra.user_id IS NOT NULL
   AND NOT EXISTS (
     SELECT 1 FROM public.legal_acceptance_log l
      WHERE l.user_id = ra.user_id
        AND l.document_code = 'SKPA'
        AND l.action = 'accepted'
   )
ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;