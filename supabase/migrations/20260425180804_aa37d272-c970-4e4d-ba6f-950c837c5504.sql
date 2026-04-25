CREATE OR REPLACE FUNCTION public.backfill_pending_role_legal()
RETURNS TABLE(inserted_count INT, skipped_count INT)
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
    v_doc_code := CASE UPPER(r.role_code)
      WHEN 'R2' THEN 'SKPA' WHEN 'R3' THEN 'SKPA' WHEN 'R4' THEN 'SKPA'
      WHEN 'R10_CR' THEN 'SKPA' WHEN 'CR' THEN 'SKPA'
      WHEN 'R5_MP' THEN 'PWA' WHEN 'R5_AGG' THEN 'PWA' WHEN 'CU' THEN 'PWA'
      WHEN 'R7_MP' THEN 'PWA' WHEN 'R7_AGG' THEN 'PWA' WHEN 'ER' THEN 'PWA'
      WHEN 'R8' THEN 'PWA' WHEN 'FC' THEN 'PWA'
      WHEN 'R9' THEN 'PWA' WHEN 'LC' THEN 'PWA'
      WHEN 'SP' THEN 'SPA'
      ELSE NULL
    END;

    IF v_doc_code IS NULL THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    IF EXISTS (SELECT 1 FROM public.legal_acceptance_log lal
       WHERE lal.user_id = r.user_id AND lal.document_code = v_doc_code AND lal.action = 'accepted')
    THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    IF EXISTS (SELECT 1 FROM public.pending_role_legal_acceptance pra
       WHERE pra.user_id = r.user_id AND pra.doc_code = v_doc_code AND pra.role_code = r.role_code
         AND COALESCE(pra.org_id::TEXT,'') = COALESCE(r.org_id::TEXT,'') AND pra.resolved_at IS NULL)
    THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    INSERT INTO public.pending_role_legal_acceptance(user_id, org_id, role_code, doc_code, source)
    VALUES (r.user_id, r.org_id, r.role_code, v_doc_code, 'backfill')
    ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
    v_inserted := v_inserted + 1;
  END LOOP;

  FOR r IN
    SELECT sp.user_id, NULL::UUID AS org_id, 'SP'::TEXT AS role_code
      FROM public.solution_providers sp
     WHERE sp.user_id IS NOT NULL
  LOOP
    IF EXISTS (SELECT 1 FROM public.legal_acceptance_log lal
       WHERE lal.user_id = r.user_id AND lal.document_code = 'SPA' AND lal.action = 'accepted')
    THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    IF EXISTS (SELECT 1 FROM public.pending_role_legal_acceptance pra
       WHERE pra.user_id = r.user_id AND pra.doc_code = 'SPA' AND pra.resolved_at IS NULL)
    THEN v_skipped := v_skipped + 1; CONTINUE; END IF;

    INSERT INTO public.pending_role_legal_acceptance(user_id, org_id, role_code, doc_code, source)
    VALUES (r.user_id, NULL, 'SP', 'SPA', 'backfill')
    ON CONFLICT (user_id, role_code, doc_code, org_id) DO NOTHING;
    v_inserted := v_inserted + 1;
  END LOOP;

  RETURN QUERY SELECT v_inserted, v_skipped;
END;
$$;

SELECT * FROM public.backfill_pending_role_legal();