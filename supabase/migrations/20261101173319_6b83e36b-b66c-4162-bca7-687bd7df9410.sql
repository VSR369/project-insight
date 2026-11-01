CREATE OR REPLACE FUNCTION public.return_award(p_decision_id UUID, p_reason TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid UUID := auth.uid(); d RECORD; v_roles RECORD; v_min INT; v_max INT;
BEGIN
  SELECT * INTO d FROM public.challenge_award_decisions WHERE id = p_decision_id FOR UPDATE;
  IF d.id IS NULL OR d.decision_status <> 'PROPOSED' THEN RAISE EXCEPTION 'This award is not waiting for confirmation.'; END IF;
  SELECT * INTO v_roles FROM public.fn_award_actor_roles(d.challenge_id);
  IF NOT public.fn_user_has_challenge_role(v_uid, d.challenge_id, v_roles.confirmer_roles) THEN
    RAISE EXCEPTION 'You are not allowed to return the award for this challenge.';
  END IF;
  SELECT COALESCE((SELECT param_value::int FROM public.md_mpa_config WHERE param_key='config_change_reason_min_length'),10),
         COALESCE((SELECT param_value::int FROM public.md_mpa_config WHERE param_key='config_change_reason_max_length'),500)
  INTO v_min, v_max;
  IF length(trim(coalesce(p_reason,''))) < v_min OR length(trim(p_reason)) > v_max THEN
    RAISE EXCEPTION 'A reason of % to % characters is required.', v_min, v_max;
  END IF;
  UPDATE public.challenge_award_decisions SET decision_status = 'RETURNED', returned_by = v_uid,
    returned_at = now(), return_reason = trim(p_reason), updated_by = v_uid WHERE id = p_decision_id;
  DELETE FROM public.challenge_award_lines WHERE decision_id = p_decision_id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details)
  VALUES (d.challenge_id, v_uid, 'AWARD_RETURNED', 'HUMAN', jsonb_build_object('decision_id', p_decision_id, 'reason', trim(p_reason)));
END $$;