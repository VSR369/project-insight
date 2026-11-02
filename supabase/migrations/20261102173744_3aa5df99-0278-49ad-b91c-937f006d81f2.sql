CREATE OR REPLACE FUNCTION public.fn_has_accepted_cpa(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: cannot query another user''s acceptance status.';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.legal_acceptance_ledger l
    WHERE l.challenge_id = p_challenge_id AND l.user_id = p_user_id AND l.document_type ILIKE 'CPA%'
  );
END $$;

CREATE OR REPLACE FUNCTION public.fn_is_challenge_winner(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: cannot query another user''s winner status.';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.challenge_award_lines l
    JOIN public.challenge_award_decisions d ON d.id = l.decision_id AND d.decision_status = 'CONFIRMED'
    JOIN public.challenge_submissions s ON s.id = l.submission_id
    WHERE l.challenge_id = p_challenge_id
      AND (s.user_id = p_user_id
           OR s.provider_id IN (SELECT sp.id FROM public.solution_providers sp WHERE sp.user_id = p_user_id))
  );
END $$;

CREATE OR REPLACE FUNCTION public.fn_is_challenge_privileged(p_challenge_id uuid, p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: cannot query another user''s privileges.';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.challenges c
    WHERE c.id = p_challenge_id
      AND (c.tenant_id = public.get_user_tenant_id()
           OR public.has_role(p_user_id, 'platform_admin'::app_role)
           OR public.has_active_challenge_role(c.id, p_user_id))
  );
END $$;