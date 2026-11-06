CREATE OR REPLACE FUNCTION public.cancel_challenge(p_challenge_id uuid, p_reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $func$
DECLARE
  v_status TEXT;
  v_title TEXT;
  v_has_submissions BOOLEAN;
  v_is_senior BOOLEAN;
  v_is_r6_or_r2 BOOLEAN;
  v_is_creator_curator BOOLEAN;
  v_min_reason INT;
  v_published BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT status, title INTO v_status, v_title
  FROM public.challenges WHERE id = p_challenge_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'challenge_not_found';
  END IF;
  IF v_status IN ('CANCELLED', 'COMPLETED') THEN
    RAISE EXCEPTION 'challenge_already_closed';
  END IF;

  SELECT COALESCE((SELECT NULLIF(param_value, '')::INT FROM public.md_mpa_config
                   WHERE param_key = 'cancel_reason_min_length'), 100)
  INTO v_min_reason;
  IF char_length(btrim(COALESCE(p_reason, ''))) < v_min_reason THEN
    RAISE EXCEPTION 'reason_too_short';
  END IF;

  SELECT EXISTS (SELECT 1 FROM public.challenge_submissions
                 WHERE challenge_id = p_challenge_id)
  INTO v_has_submissions;

  SELECT EXISTS (SELECT 1 FROM public.platform_admin_profiles
                 WHERE user_id = auth.uid()
                   AND admin_tier IN ('senior_admin', 'supervisor'))
  INTO v_is_senior;

  SELECT EXISTS (
    SELECT 1 FROM public.md_status_set_values v
    WHERE v.set_code = 'ST-24' AND v.status_code = v_status
      AND v.sort_order >= (SELECT sort_order FROM public.md_status_set_values
                           WHERE set_code = 'ST-24' AND status_code = 'PUBLISHED')
  ) INTO v_published;

  IF v_has_submissions THEN
    IF NOT v_is_senior THEN
      RAISE EXCEPTION 'cancel_requires_senior_admin';
    END IF;
  ELSIF v_published THEN
    SELECT EXISTS (
      SELECT 1 FROM public.challenge_role_assignments cra
      JOIN public.platform_provider_pool p ON p.id = cra.pool_member_id
      WHERE cra.challenge_id = p_challenge_id
        AND cra.status = 'active'
        AND cra.role_code IN ('R6_AGG', 'R2')
        AND p.user_id = auth.uid()
    ) INTO v_is_r6_or_r2;
    IF NOT v_is_r6_or_r2 THEN
      RAISE EXCEPTION 'cancel_requires_r6_agg_or_r2';
    END IF;
  ELSE
    SELECT public.fn_user_has_challenge_role(auth.uid(), p_challenge_id, ARRAY['CR', 'CU'])
    INTO v_is_creator_curator;
    IF NOT v_is_creator_curator THEN
      RAISE EXCEPTION 'cancel_requires_creator_or_curator';
    END IF;
  END IF;

  UPDATE public.challenges SET phase_status = 'TERMINAL' WHERE id = p_challenge_id;

  UPDATE public.sla_timers
  SET status = 'COMPLETED', completed_at = now()
  WHERE challenge_id = p_challenge_id AND status IN ('ACTIVE', 'PAUSED');

  PERFORM public.log_audit(
    p_challenge_id, NULL, auth.uid(),
    'CHALLENGE_CANCELLED', 'RPC',
    jsonb_build_object('reason', p_reason)
  );

  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message)
  SELECT DISTINCT ucr.user_id, p_challenge_id, 'CHALLENGE_CANCELLED',
    'Challenge Cancelled',
    'Challenge "' || COALESCE(v_title, '') || '" has been cancelled. Reason: ' || p_reason
  FROM public.user_challenge_roles ucr
  WHERE ucr.challenge_id = p_challenge_id AND ucr.is_active;
END
$func$;

REVOKE EXECUTE ON FUNCTION public.cancel_challenge(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_challenge(uuid, text) TO authenticated;