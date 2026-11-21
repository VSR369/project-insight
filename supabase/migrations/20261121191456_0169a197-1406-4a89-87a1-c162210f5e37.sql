CREATE OR REPLACE FUNCTION public.get_challenge_minimum_mode(p_challenge_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_cur text; v_limits jsonb;
BEGIN
  SELECT * INTO c FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (c.created_by = auth.uid() OR EXISTS (SELECT 1 FROM public.user_challenge_roles r
          WHERE r.challenge_id = p_challenge_id AND r.user_id = auth.uid() AND r.is_active)
          OR public.has_role(auth.uid(), 'platform_admin'::public.app_role)) THEN
    RAISE EXCEPTION 'not_authorized' USING ERRCODE = '42501';
  END IF;
  v_limits := c.governance_threshold_snapshot;
  IF v_limits IS NULL THEN
    v_cur := UPPER(COALESCE(c.currency_code, c.reward_structure->>'currency', 'USD'));
    SELECT jsonb_object_agg(param_key, threshold_amount) INTO v_limits
      FROM public.md_legal_review_thresholds
     WHERE currency_code = v_cur AND is_active
       AND param_key IN ('express_award_limit','high_rigor_award_threshold');
  END IF;
  RETURN private.fn_minimum_governance_mode(private.fn_challenge_award_pool(c.reward_structure, c.reward_amount),
                                            c.is_regulated, c.is_ip_sensitive, COALESCE(v_limits, '{}'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.get_challenge_minimum_mode(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_challenge_minimum_mode(uuid) TO authenticated;