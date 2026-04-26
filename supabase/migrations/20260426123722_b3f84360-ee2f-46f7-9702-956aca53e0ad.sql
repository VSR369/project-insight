-- Phase 8 backfill: enqueue SKPA for active R2 admins who predate the trigger
-- and were missed by earlier backfills.
INSERT INTO public.pending_role_legal_acceptance (user_id, role_code, doc_code, org_id, source)
SELECT DISTINCT ra.user_id, 'R2'::text, 'SKPA'::text, ra.org_id, 'backfill'::text
FROM public.role_assignments ra
WHERE ra.role_code = 'R2'
  AND ra.status = 'active'
  AND ra.user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.legal_acceptance_log la
    WHERE la.user_id = ra.user_id
      AND la.document_code = 'SKPA'
      AND la.action = 'accepted'
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.pending_role_legal_acceptance p
    WHERE p.user_id = ra.user_id
      AND p.doc_code = 'SKPA'
      AND p.resolved_at IS NULL
  );