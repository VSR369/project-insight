ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS stage_count smallint,
  ADD COLUMN IF NOT EXISTS start_at timestamptz,
  ADD COLUMN IF NOT EXISTS abstract_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS solution_deadline timestamptz;

INSERT INTO public.md_mpa_config (param_key, param_value, param_type, param_group, label, unit, min_value, max_value, description)
VALUES
 ('abstract_min_open_period_days','7','INTEGER','CHALLENGE_TIMING','Minimum abstract open period','days',1,180,'Two-stage: minimum days between start and abstract deadline, and between abstract and solution deadline (DEF-0036)'),
 ('deadline_max_extension_days','30','INTEGER','CHALLENGE_TIMING','Maximum single deadline extension','days',1,180,'Largest extension a Curator may grant in one step (DEF-0036)'),
 ('deadline_extension_reason_min_length','20','INTEGER','GOVERNANCE_RULES','Minimum deadline-extension reason length','characters',1,2000,'Written reason required for a deadline extension (DEF-0036)')
ON CONFLICT (param_key) DO NOTHING;

DROP POLICY IF EXISTS authenticated_read_business_rule_numbers ON public.md_mpa_config;
CREATE POLICY authenticated_read_business_rule_numbers ON public.md_mpa_config FOR SELECT TO authenticated
USING (COALESCE(is_sensitive,false) = false AND param_key = ANY (ARRAY['return_reason_min_length','hold_reason_min_length','cancel_reason_min_length','screening_commentary_min_length','qa_question_min_length','creator_response_timeout_days','amendment_withdrawal_window_days','amendment_reacceptance_window_days','curator_edit_rewrite_threshold_pct','solution_max_files','solution_approach_summary_min_chars','abstract_min_chars','challenge_min_open_period_days','abstract_min_open_period_days','deadline_max_extension_days','deadline_extension_reason_min_length']));

CREATE OR REPLACE FUNCTION private.fn_challenge_setting_int(p_snapshot jsonb, p_key text)
RETURNS int LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(NULLIF(p_snapshot->'settings'->>p_key,'')::int,
                  (SELECT NULLIF(param_value,'')::int FROM public.md_mpa_config WHERE param_key = p_key));
$$;
REVOKE ALL ON FUNCTION private.fn_challenge_setting_int(jsonb,text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.fn_validate_challenge_stages_deadlines()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mode text; v_min int; v_abs_min int; v_published boolean; v_ext boolean;
BEGIN
  v_mode := COALESCE(NEW.governance_mode_override, NEW.governance_profile, 'STRUCTURED');
  IF v_mode = 'LIGHTWEIGHT' THEN v_mode := 'QUICK'; ELSIF v_mode = 'ENTERPRISE' THEN v_mode := 'CONTROLLED'; END IF;
  v_published := TG_OP = 'UPDATE' AND OLD.published_at IS NOT NULL;
  v_ext := current_setting('app.deadline_extension', true) = 'on';

  IF v_mode = 'QUICK' THEN NEW.stage_count := 1;
  ELSIF v_mode = 'CONTROLLED' THEN NEW.stage_count := 2;
  ELSE NEW.stage_count := COALESCE(NEW.stage_count, 1);
  END IF;
  IF NEW.stage_count NOT IN (1,2) THEN RAISE EXCEPTION 'Stage count must be 1 or 2.' USING ERRCODE='check_violation'; END IF;

  IF v_published THEN
    IF NEW.stage_count IS DISTINCT FROM OLD.stage_count THEN
      RAISE EXCEPTION 'The stage choice is frozen once the challenge is published.' USING ERRCODE='check_violation';
    END IF;
    IF (NEW.start_at IS DISTINCT FROM OLD.start_at OR NEW.abstract_deadline IS DISTINCT FROM OLD.abstract_deadline
        OR NEW.solution_deadline IS DISTINCT FROM OLD.solution_deadline) AND NOT v_ext THEN
      RAISE EXCEPTION 'Published deadlines can only be extended by the Curator with a reason.' USING ERRCODE='check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.stage_count = 1 THEN NEW.abstract_deadline := NULL; END IF;
  IF NEW.solution_deadline IS NOT NULL THEN NEW.submission_deadline := NEW.solution_deadline; END IF;
  IF NEW.start_at IS NULL OR NEW.solution_deadline IS NULL THEN RETURN NEW; END IF;

  v_min := private.fn_challenge_setting_int(NEW.config_snapshot, 'challenge_min_open_period_days');
  v_abs_min := private.fn_challenge_setting_int(NEW.config_snapshot, 'abstract_min_open_period_days');
  IF NEW.solution_deadline < NEW.start_at + make_interval(days => v_min) THEN
    RAISE EXCEPTION 'The solution deadline must be at least % days after the start date.', v_min USING ERRCODE='check_violation';
  END IF;
  IF NEW.stage_count = 2 THEN
    IF NEW.abstract_deadline IS NULL THEN
      RAISE EXCEPTION 'Two-stage challenges need an abstract deadline.' USING ERRCODE='check_violation';
    END IF;
    IF NEW.abstract_deadline < NEW.start_at + make_interval(days => v_abs_min)
       OR NEW.solution_deadline < NEW.abstract_deadline + make_interval(days => v_abs_min) THEN
      RAISE EXCEPTION 'The abstract deadline must be at least % days after the start date and % days before the solution deadline.', v_abs_min, v_abs_min USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.fn_validate_challenge_stages_deadlines() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_challenges_biu_stages_deadlines ON public.challenges;
CREATE TRIGGER trg_challenges_biu_stages_deadlines BEFORE INSERT OR UPDATE ON public.challenges
FOR EACH ROW EXECUTE FUNCTION public.fn_validate_challenge_stages_deadlines();

CREATE OR REPLACE FUNCTION public.extend_challenge_deadline(p_challenge_id uuid, p_which text, p_new_deadline timestamptz, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_old timestamptz; v_max int; v_min_reason int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id, published_at, stage_count, abstract_deadline, solution_deadline, config_snapshot INTO c
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
END $$;
REVOKE ALL ON FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) TO authenticated;