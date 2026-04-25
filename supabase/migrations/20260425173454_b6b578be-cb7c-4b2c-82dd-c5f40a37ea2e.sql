-- Auto-create pending_role_legal_acceptance whenever a role assignment is
-- created or transitions into 'invited'/'active'. Idempotent.

CREATE OR REPLACE FUNCTION public.trg_role_assignment_create_pending_legal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_doc_code TEXT;
BEGIN
  -- Only act when there's a user_id and status is invited/active
  IF NEW.user_id IS NULL OR NEW.status NOT IN ('invited','active') THEN
    RETURN NEW;
  END IF;

  v_doc_code := CASE
    WHEN NEW.role_code IN ('R2')                          THEN 'SKPA'
    WHEN NEW.role_code IN ('R3','R4','R10_CR','CR')       THEN 'SKPA'
    WHEN NEW.role_code IN ('R5_MP','R5_AGG','CU')         THEN 'PWA'
    WHEN NEW.role_code IN ('R7_MP','R7_AGG','ER')         THEN 'PWA'
    WHEN NEW.role_code IN ('R8','FC')                     THEN 'PWA'
    WHEN NEW.role_code IN ('R9','LC')                     THEN 'PWA'
    ELSE NULL
  END;

  IF v_doc_code IS NULL THEN
    RETURN NEW;
  END IF;

  -- Skip if user has already accepted this doc_code
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

DROP TRIGGER IF EXISTS trg_role_assignment_pending_legal_ins ON public.role_assignments;
CREATE TRIGGER trg_role_assignment_pending_legal_ins
  AFTER INSERT ON public.role_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_role_assignment_create_pending_legal();

DROP TRIGGER IF EXISTS trg_role_assignment_pending_legal_upd ON public.role_assignments;
CREATE TRIGGER trg_role_assignment_pending_legal_upd
  AFTER UPDATE OF status, user_id ON public.role_assignments
  FOR EACH ROW
  WHEN (NEW.status IN ('invited','active') AND NEW.user_id IS NOT NULL)
  EXECUTE FUNCTION public.trg_role_assignment_create_pending_legal();
