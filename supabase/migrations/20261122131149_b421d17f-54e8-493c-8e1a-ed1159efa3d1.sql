CREATE OR REPLACE FUNCTION public.set_abstract_selection(p_solution_id uuid, p_selection text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record; c record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF p_selection NOT IN ('SHORTLISTED','REJECTED') THEN RAISE EXCEPTION 'invalid_abstract_selection'; END IF;
  SELECT id, challenge_id, provider_id, submitted_at INTO s FROM public.solutions WHERE id = p_solution_id;
  IF NOT FOUND OR s.submitted_at IS NULL THEN RAISE EXCEPTION 'abstract_not_submitted'; END IF;
  SELECT id, stage_count INTO c FROM public.challenges WHERE id = s.challenge_id FOR UPDATE;
  IF c.stage_count <> 2 THEN RAISE EXCEPTION 'shortlist_requires_two_stage'; END IF;
  IF NOT public.can_perform(auth.uid(), c.id, 'ER') THEN RAISE EXCEPTION 'abstract_review_requires_reviewer' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.solutions WHERE challenge_id = c.id AND selection_status = 'APPROVED_SHORTLIST') THEN
    RAISE EXCEPTION 'shortlist_already_approved';
  END IF;
  UPDATE public.solutions SET selection_status = p_selection, updated_at = now(), updated_by = auth.uid() WHERE id = s.id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (c.id, auth.uid(), CASE WHEN p_selection = 'SHORTLISTED' THEN 'ABSTRACT_SHORTLISTED' ELSE 'ABSTRACT_REJECTED' END,
          'RPC', jsonb_build_object('solution_id', s.id, 'selection', p_selection), auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.set_abstract_selection(uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_abstract_selection(uuid,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_abstract_shortlist(p_challenge_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_pending int; v_shortlisted int; v_rejected int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  SELECT id, title, stage_count INTO c FROM public.challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF c.stage_count <> 2 THEN RAISE EXCEPTION 'shortlist_requires_two_stage'; END IF;
  IF NOT public.can_perform(auth.uid(), c.id, 'CU') THEN RAISE EXCEPTION 'shortlist_approval_requires_curator' USING ERRCODE='42501'; END IF;
  IF EXISTS (SELECT 1 FROM public.solutions WHERE challenge_id = c.id AND selection_status = 'APPROVED_SHORTLIST') THEN
    RAISE EXCEPTION 'shortlist_already_approved';
  END IF;
  SELECT count(*) FILTER (WHERE COALESCE(selection_status,'PENDING') = 'PENDING'),
         count(*) FILTER (WHERE selection_status = 'SHORTLISTED'),
         count(*) FILTER (WHERE selection_status = 'REJECTED')
    INTO v_pending, v_shortlisted, v_rejected
    FROM public.solutions WHERE challenge_id = c.id AND submitted_at IS NOT NULL;
  IF v_pending > 0 THEN RAISE EXCEPTION 'shortlist_has_pending_abstracts'; END IF;
  IF v_shortlisted = 0 THEN RAISE EXCEPTION 'shortlist_requires_selection'; END IF;

  UPDATE public.solutions SET selection_status = 'APPROVED_SHORTLIST', updated_at = now(), updated_by = auth.uid()
  WHERE challenge_id = c.id AND selection_status = 'SHORTLISTED';

  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
  SELECT provider_id, c.id, 'SHORTLISTED', 'Your abstract has been shortlisted',
         'Your abstract for "' || c.title || '" has been shortlisted. You may now upload your full solution.',
         '/cogni/challenges/' || c.id || '/view'
    FROM public.solutions WHERE challenge_id = c.id AND selection_status = 'APPROVED_SHORTLIST';
  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
  SELECT provider_id, c.id, 'ABSTRACT_REJECTED', 'Abstract not selected',
         'Your abstract for "' || c.title || '" was not selected for the shortlist. Thank you for your submission.',
         '/cogni/challenges/' || c.id || '/view'
    FROM public.solutions WHERE challenge_id = c.id AND selection_status = 'REJECTED';

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (c.id, auth.uid(), 'SHORTLIST_APPROVED', 'RPC',
          jsonb_build_object('shortlisted', v_shortlisted, 'rejected', v_rejected), auth.uid());
  RETURN jsonb_build_object('shortlistedCount', v_shortlisted, 'rejectedCount', v_rejected);
END $$;
REVOKE ALL ON FUNCTION public.approve_abstract_shortlist(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_abstract_shortlist(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_full_solution(p_solution_id uuid, p_files jsonb)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF jsonb_typeof(p_files) <> 'array' OR jsonb_array_length(p_files) = 0 THEN RAISE EXCEPTION 'full_solution_files_required'; END IF;
  SELECT s.id, s.challenge_id, s.provider_id, s.submitted_at, s.selection_status,
         c.stage_count, c.solution_deadline
    INTO s FROM public.solutions s JOIN public.challenges c ON c.id = s.challenge_id
   WHERE s.id = p_solution_id FOR UPDATE OF s;
  IF NOT FOUND OR s.submitted_at IS NULL THEN RAISE EXCEPTION 'abstract_not_submitted'; END IF;
  IF s.provider_id <> auth.uid() THEN RAISE EXCEPTION 'full_solution_requires_owner' USING ERRCODE='42501'; END IF;
  IF s.stage_count <> 2 THEN RAISE EXCEPTION 'full_solution_requires_two_stage'; END IF;
  IF COALESCE(s.selection_status,'') NOT IN ('SHORTLISTED','APPROVED_SHORTLIST') THEN RAISE EXCEPTION 'full_solution_requires_shortlist' USING ERRCODE='42501'; END IF;
  IF s.solution_deadline IS NOT NULL AND now() > s.solution_deadline THEN RAISE EXCEPTION 'solution_deadline_passed'; END IF;

  UPDATE public.solutions SET full_solution_url = p_files::text, phase_status = 'FULL_UPLOADED', updated_at = now(), updated_by = auth.uid()
  WHERE id = s.id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (s.challenge_id, auth.uid(), 'FULL_SOLUTION_SUBMITTED', 'RPC',
          jsonb_build_object('solution_id', s.id, 'file_count', jsonb_array_length(p_files)), auth.uid());
END $$;
REVOKE ALL ON FUNCTION public.submit_full_solution(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_full_solution(uuid,jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.extend_challenge_deadline(p_challenge_id uuid, p_which text, p_new_deadline timestamptz, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_old timestamptz; v_max int; v_min_reason int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id, title, published_at, stage_count, abstract_deadline, solution_deadline, config_snapshot INTO c
    FROM public.challenges WHERE id = p_challenge_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'challenge_not_found'; END IF;
  IF NOT public.fn_user_has_challenge_role(auth.uid(), p_challenge_id, ARRAY['CU']) THEN
    RAISE EXCEPTION 'extension_requires_curator' USING ERRCODE='42501';
  END IF;
  IF c.published_at IS NULL THEN RAISE EXCEPTION 'extension_only_after_publication'; END IF;
  v_min_reason := private.fn_challenge_setting_int(c.config_snapshot, 'deadline_extension_reason_min_length');
  IF char_length(btrim(COALESCE(p_reason,''))) < v_min_reason THEN RAISE EXCEPTION 'reason_too_short'; END IF;
  IF p_which = 'abstract' AND c.stage_count = 2 THEN v_old := c.abstract_deadline;
  ELSIF p_which = 'solution' THEN v_old := c.solution_deadline;
  ELSE RAISE EXCEPTION 'invalid_deadline'; END IF;
  IF v_old IS NULL OR v_old < now() THEN RAISE EXCEPTION 'deadline_already_passed'; END IF;
  IF p_new_deadline <= v_old THEN RAISE EXCEPTION 'deadline_cannot_be_shortened'; END IF;
  v_max := private.fn_challenge_setting_int(c.config_snapshot, 'deadline_max_extension_days');
  IF p_new_deadline > v_old + make_interval(days => v_max) THEN RAISE EXCEPTION 'extension_exceeds_maximum'; END IF;
  IF p_which = 'abstract' AND p_new_deadline >= c.solution_deadline THEN RAISE EXCEPTION 'abstract_after_solution'; END IF;

  PERFORM set_config('app.deadline_extension', 'on', true);
  IF p_which = 'abstract' THEN
    UPDATE public.challenges SET abstract_deadline = p_new_deadline WHERE id = p_challenge_id;
  ELSE
    UPDATE public.challenges SET solution_deadline = p_new_deadline, submission_deadline = p_new_deadline WHERE id = p_challenge_id;
  END IF;
  PERFORM set_config('app.deadline_extension', 'off', true);

  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (p_challenge_id, auth.uid(), 'DEADLINE_EXTENDED', 'RPC',
          jsonb_build_object('deadline', p_which, 'from', v_old, 'to', p_new_deadline, 'reason', btrim(p_reason)), auth.uid());
  INSERT INTO public.cogni_notifications (user_id, challenge_id, notification_type, title, message, action_url)
  SELECT DISTINCT recipients.user_id, c.id, 'DEADLINE_EXTENDED', 'Challenge deadline extended',
         'The ' || p_which || ' deadline for "' || c.title || '" is now ' ||
         to_char(p_new_deadline AT TIME ZONE 'UTC', 'DD Mon YYYY HH24:MI') || ' UTC. Reason: ' || btrim(p_reason),
         '/cogni/challenges/' || c.id || '/view'
    FROM (
      SELECT provider_id AS user_id FROM public.solutions WHERE challenge_id = c.id
      UNION
      SELECT user_id FROM public.challenge_submissions WHERE challenge_id = c.id AND is_deleted = false AND user_id IS NOT NULL
    ) recipients;
END $$;
REVOKE ALL ON FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) TO authenticated;