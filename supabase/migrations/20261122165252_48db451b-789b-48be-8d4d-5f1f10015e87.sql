-- lovable-cron-fallback-reviewed: J17 and J18 explicitly require five-minute date/deadline checks; they share one job, totalling 288 runs/day, because no delayed-workflow provider is enabled.
INSERT INTO public.md_mpa_config
  (param_key, param_value, param_type, param_group, label, unit, min_value, max_value, description, is_sensitive)
VALUES
  ('solution_min_open_period_days','21','INTEGER','CHALLENGE_TIMING','Minimum full-solution open period','days','1','180','Two-stage: minimum days between abstract and solution deadlines (P33).',false),
  ('deadline_max_extensions_per_deadline','2','INTEGER','CHALLENGE_TIMING','Maximum extensions per deadline','extensions','0','10','Maximum number of Curator extensions for each deadline (P34).',false)
ON CONFLICT (param_key) DO NOTHING;

UPDATE public.md_mpa_config SET param_value='14', min_value='1', max_value='180',
  description='Two-stage: minimum days between start and abstract deadline (P33).'
WHERE param_key='abstract_min_open_period_days';
UPDATE public.md_mpa_config SET param_value='14', min_value='1', max_value='180',
  description='Largest single Curator deadline extension; at most two extensions per deadline (P34).'
WHERE param_key='deadline_max_extension_days';
UPDATE public.md_mpa_config SET param_value='30', min_value='10', max_value='2000',
  description='Minimum length of the written reason for each deadline extension (P35).'
WHERE param_key='deadline_extension_reason_min_length';

DROP POLICY IF EXISTS authenticated_read_lifecycle_timing_rules ON public.md_mpa_config;
CREATE POLICY authenticated_read_lifecycle_timing_rules ON public.md_mpa_config
FOR SELECT TO authenticated
USING (COALESCE(is_sensitive,false)=false AND param_key IN
  ('solution_min_open_period_days','deadline_max_extensions_per_deadline'));

ALTER FUNCTION public.fn_validate_challenge_stages_deadlines() SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.fn_validate_challenge_stages_deadlines()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_mode text; v_min int; v_abs_min int; v_sol_min int; v_published boolean; v_ext boolean;
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
  v_sol_min := private.fn_challenge_setting_int(NEW.config_snapshot, 'solution_min_open_period_days');
  IF NEW.solution_deadline < NEW.start_at + make_interval(days => v_min) THEN
    RAISE EXCEPTION 'The solution deadline must be at least % days after the start date.', v_min USING ERRCODE='check_violation';
  END IF;
  IF NEW.stage_count = 2 THEN
    IF NEW.abstract_deadline IS NULL THEN
      RAISE EXCEPTION 'Two-stage challenges need an abstract deadline.' USING ERRCODE='check_violation';
    END IF;
    IF NEW.abstract_deadline < NEW.start_at + make_interval(days => v_abs_min) THEN
      RAISE EXCEPTION 'The abstract deadline must be at least % days after the start date.', v_abs_min USING ERRCODE='check_violation';
    END IF;
    IF NEW.solution_deadline < NEW.abstract_deadline + make_interval(days => v_sol_min) THEN
      RAISE EXCEPTION 'The full-solution window must be at least % days.', v_sol_min USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fn_validate_challenge_stages_deadlines() FROM PUBLIC, anon, authenticated;

ALTER FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.extend_challenge_deadline(p_challenge_id uuid, p_which text, p_new_deadline timestamptz, p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_old timestamptz; v_max int; v_min_reason int; v_max_extensions int; v_extensions int;
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
  v_max_extensions := private.fn_challenge_setting_int(c.config_snapshot, 'deadline_max_extensions_per_deadline');
  SELECT count(*) INTO v_extensions FROM public.audit_trail
  WHERE challenge_id=p_challenge_id AND action='DEADLINE_EXTENDED' AND details->>'deadline'=p_which;
  IF v_extensions >= v_max_extensions THEN RAISE EXCEPTION 'extension_limit_reached'; END IF;
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
          jsonb_build_object('deadline', p_which, 'from', v_old, 'to', p_new_deadline, 'reason', btrim(p_reason),
                             'extension_number', v_extensions + 1, 'maximum_extensions', v_max_extensions), auth.uid());
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
END;
$$;
REVOKE ALL ON FUNCTION private.extend_challenge_deadline(uuid,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.extend_challenge_deadline(uuid,text,timestamptz,text) TO authenticated;
CREATE FUNCTION public.extend_challenge_deadline(p_challenge_id uuid, p_which text, p_new_deadline timestamptz, p_reason text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = public AS $$
  SELECT private.extend_challenge_deadline(p_challenge_id,p_which,p_new_deadline,p_reason);
$$;
REVOKE ALL ON FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.extend_challenge_deadline(uuid,text,timestamptz,text) TO authenticated;

CREATE OR REPLACE FUNCTION private.submit_full_solution(p_solution_id uuid, p_files jsonb)
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
  IF s.solution_deadline IS NOT NULL AND now() > s.solution_deadline THEN
    RAISE EXCEPTION 'The submission deadline for this challenge has passed.';
  END IF;
  UPDATE public.solutions SET full_solution_url = p_files::text, phase_status = 'FULL_UPLOADED', updated_at = now(), updated_by = auth.uid()
  WHERE id = s.id;
  INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
  VALUES (s.challenge_id, auth.uid(), 'FULL_SOLUTION_SUBMITTED', 'RPC',
          jsonb_build_object('solution_id', s.id, 'file_count', jsonb_array_length(p_files)), auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION private.submit_full_solution(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.submit_full_solution(uuid,jsonb) TO authenticated;

ALTER FUNCTION public.fn_guard_solution_freeze() SET SCHEMA private;
CREATE OR REPLACE FUNCTION private.fn_guard_solution_freeze()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record; v_deadline timestamptz; v_is_full boolean;
BEGIN
  SELECT stage_count, abstract_deadline, solution_deadline, submission_deadline INTO c
  FROM public.challenges WHERE id=NEW.challenge_id;
  v_is_full := NEW.full_solution_url IS DISTINCT FROM OLD.full_solution_url AND NEW.full_solution_url IS NOT NULL;
  IF COALESCE(c.stage_count,1)=1 THEN
    v_deadline := COALESCE(c.solution_deadline,c.submission_deadline);
  ELSIF v_is_full THEN
    v_deadline := c.solution_deadline;
  ELSE
    v_deadline := COALESCE(c.abstract_deadline,c.submission_deadline);
  END IF;
  IF v_deadline IS NULL OR now() <= v_deadline THEN RETURN NEW; END IF;
  IF OLD.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    NEW.file_fingerprint := md5(
      coalesce(OLD.abstract_text,'') || '|' || coalesce(OLD.methodology,'') || '|' ||
      coalesce(OLD.timeline,'') || '|' || coalesce(OLD.experience,'') || '|' ||
      coalesce(OLD.full_solution_url,''));
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.provider_id IS NOT NULL AND auth.uid() = OLD.provider_id THEN
    RAISE EXCEPTION 'The submission deadline for this challenge has passed.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fn_guard_solution_freeze() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.fn_refuse_late_solution_insert()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE c record; v_deadline timestamptz;
BEGIN
  IF NEW.submitted_at IS NULL OR auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.provider_id THEN RETURN NEW; END IF;
  SELECT stage_count,abstract_deadline,solution_deadline,submission_deadline INTO c
  FROM public.challenges WHERE id=NEW.challenge_id;
  IF COALESCE(c.stage_count,1)=1 THEN v_deadline:=COALESCE(c.solution_deadline,c.submission_deadline);
  ELSE v_deadline:=COALESCE(c.abstract_deadline,c.submission_deadline); END IF;
  IF v_deadline IS NOT NULL AND now()>v_deadline THEN
    RAISE EXCEPTION 'The submission deadline for this challenge has passed.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fn_refuse_late_solution_insert() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_zz_refuse_late_solution_insert ON public.solutions;
CREATE TRIGGER trg_zz_refuse_late_solution_insert BEFORE INSERT ON public.solutions
FOR EACH ROW EXECUTE FUNCTION private.fn_refuse_late_solution_insert();

CREATE OR REPLACE FUNCTION private.fn_refuse_late_challenge_submission()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE v_deadline timestamptz;
BEGIN
  IF auth.uid() IS NULL OR auth.uid() IS DISTINCT FROM NEW.user_id THEN RETURN NEW; END IF;
  IF TG_OP='UPDATE' AND NEW.submission_text IS NOT DISTINCT FROM OLD.submission_text
     AND NEW.submission_files IS NOT DISTINCT FROM OLD.submission_files THEN RETURN NEW; END IF;
  SELECT COALESCE(solution_deadline,submission_deadline) INTO v_deadline
  FROM public.challenges WHERE id=NEW.challenge_id;
  IF v_deadline IS NOT NULL AND now()>v_deadline THEN
    RAISE EXCEPTION 'The submission deadline for this challenge has passed.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fn_refuse_late_challenge_submission() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_zz_refuse_late_challenge_submission ON public.challenge_submissions;
CREATE TRIGGER trg_zz_refuse_late_challenge_submission BEFORE INSERT OR UPDATE ON public.challenge_submissions
FOR EACH ROW EXECUTE FUNCTION private.fn_refuse_late_challenge_submission();

ALTER TABLE public.solutions ADD COLUMN IF NOT EXISTS purge_at timestamptz;
ALTER TABLE public.challenge_submissions ADD COLUMN IF NOT EXISTS purge_at timestamptz;

CREATE OR REPLACE FUNCTION private.fn_record_nonselected_purge_dates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_days int; v_closed_at timestamptz;
BEGIN
  IF NEW.status NOT IN ('COMPLETED','CANCELLED') OR OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  v_days := private.fn_challenge_setting_int(NEW.config_snapshot,'non_selected_purge_days');
  v_closed_at := COALESCE(NEW.completed_at,now());
  UPDATE public.solutions SET purge_at=v_closed_at+make_interval(days=>v_days)
  WHERE challenge_id=NEW.id AND upper(COALESCE(selection_status,'')) IN
    ('REJECTED','NOT_SELECTED','NOT_SHORTLISTED','DISQUALIFIED');
  UPDATE public.challenge_submissions SET purge_at=v_closed_at+make_interval(days=>v_days),updated_at=now()
  WHERE challenge_id=NEW.id AND upper(COALESCE(status,'')) IN
    ('REJECTED','NOT_SELECTED','NOT_SHORTLISTED','DISQUALIFIED');
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.fn_record_nonselected_purge_dates() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS trg_zz_record_nonselected_purge_dates ON public.challenges;
CREATE TRIGGER trg_zz_record_nonselected_purge_dates AFTER UPDATE OF status ON public.challenges
FOR EACH ROW EXECUTE FUNCTION private.fn_record_nonselected_purge_dates();

CREATE OR REPLACE FUNCTION private.run_challenge_deadline_job()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  c record; v_governance text; v_target int; v_current int; v_result jsonb;
  v_required_role text; v_notified int; v_closed int:=0; v_failed int:=0; v_error text;
BEGIN
  FOR c IN
    SELECT id,title,created_by,current_phase,stage_count,abstract_deadline,solution_deadline,
           COALESCE(governance_mode_override,governance_profile,'STRUCTURED') AS governance_mode
    FROM public.challenges
    WHERE phase_status='ACTIVE' AND status IN ('PUBLISHED','EXTENDED') AND (
      (current_phase=5 AND COALESCE(stage_count,1)=2 AND abstract_deadline IS NOT NULL AND abstract_deadline<=now())
      OR (current_phase=7 AND solution_deadline IS NOT NULL AND solution_deadline<=now())
      OR (current_phase=5 AND COALESCE(stage_count,1)=1 AND solution_deadline IS NOT NULL AND solution_deadline<=now())
    ) ORDER BY COALESCE(abstract_deadline,solution_deadline)
    FOR UPDATE SKIP LOCKED
  LOOP
    v_governance:=CASE WHEN c.governance_mode IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK'
                       WHEN c.governance_mode IN ('ENTERPRISE','CONTROLLED') THEN 'CONTROLLED' ELSE 'STRUCTURED' END;
    v_target:=CASE WHEN COALESCE(c.stage_count,1)=2 AND c.current_phase=5 THEN 6 ELSE 8 END;
    v_current:=c.current_phase;
    BEGIN
      WHILE v_current<v_target LOOP
        v_result:=public.complete_phase(c.id,c.created_by);
        IF v_current=COALESCE((v_result->>'current_phase')::int,v_current) THEN
          RAISE EXCEPTION 'Lifecycle did not advance from phase %.',v_current;
        END IF;
        v_current:=(v_result->>'current_phase')::int;
      END LOOP;
      IF v_current<>v_target THEN RAISE EXCEPTION 'Lifecycle stopped at phase % instead of %.',v_current,v_target; END IF;

      INSERT INTO public.audit_trail(challenge_id,user_id,action,method,phase_from,phase_to,details,created_by)
      VALUES(c.id,c.created_by,'SUBMISSION_DEADLINE_CLOSED','SYSTEM',c.current_phase,v_target,
             jsonb_build_object('job','J18','deadline',CASE WHEN v_target=6 THEN c.abstract_deadline ELSE c.solution_deadline END),c.created_by);

      SELECT required_role INTO v_required_role FROM public.md_lifecycle_phase_config
      WHERE governance_mode=v_governance AND phase_number=v_target AND is_active=true;
      INSERT INTO public.cogni_notifications(user_id,challenge_id,notification_type,title,message,action_url)
      SELECT DISTINCT recipients.user_id,c.id,'SUBMISSION_DEADLINE_CLOSED','Submission deadline closed',
             'The submission deadline for "'||c.title||'" has passed. The challenge is now in review.',
             '/cogni/challenges/'||c.id||'/manage'
      FROM (
        SELECT pp.user_id FROM public.challenge_role_assignments cra
        JOIN public.platform_provider_pool pp ON pp.id=cra.pool_member_id
        WHERE cra.challenge_id=c.id AND cra.status='ACTIVE' AND cra.role_code=v_required_role
        UNION
        SELECT c.created_by WHERE v_required_role='CR'
      ) recipients WHERE recipients.user_id IS NOT NULL;
      GET DIAGNOSTICS v_notified=ROW_COUNT;
      IF v_notified=0 AND c.created_by IS NOT NULL THEN
        INSERT INTO public.cogni_notifications(user_id,challenge_id,notification_type,title,message,action_url)
        VALUES(c.created_by,c.id,'PHASE_OWNER_UNASSIGNED','Review phase needs an owner',
               'The submission deadline for "'||c.title||'" closed, but no active phase owner was notified.',
               '/cogni/challenges/'||c.id||'/manage');
      END IF;
      v_closed:=v_closed+1;
    EXCEPTION WHEN OTHERS THEN
      v_failed:=v_failed+1; v_error:=SQLERRM;
      INSERT INTO public.audit_trail(challenge_id,user_id,action,method,details,created_by)
      VALUES(c.id,c.created_by,'DEADLINE_CLOSE_FAILED','SYSTEM',jsonb_build_object('job','J18','error',v_error),c.created_by);
      INSERT INTO public.cogni_notifications(user_id,challenge_id,notification_type,title,message,action_url)
      SELECT DISTINCT recipients.user_id,c.id,'DEADLINE_CLOSE_FAILED','Deadline closure needs attention',
             'The deadline for "'||c.title||'" could not be closed: '||v_error,
             '/cogni/challenges/'||c.id||'/manage'
      FROM (
        SELECT c.created_by AS user_id
        UNION
        SELECT pp.user_id FROM public.challenge_role_assignments cra
        JOIN public.platform_provider_pool pp ON pp.id=cra.pool_member_id
        WHERE cra.challenge_id=c.id AND cra.role_code='CU' AND cra.status='ACTIVE'
      ) recipients
      WHERE recipients.user_id IS NOT NULL AND NOT EXISTS(
        SELECT 1 FROM public.cogni_notifications n WHERE n.user_id=recipients.user_id AND n.challenge_id=c.id
          AND n.notification_type='DEADLINE_CLOSE_FAILED' AND n.is_read=false
      );
    END;
  END LOOP;
  RETURN jsonb_build_object('closed',v_closed,'failed',v_failed,'ran_at',now());
END;
$$;
REVOKE ALL ON FUNCTION private.run_challenge_deadline_job() FROM PUBLIC,anon,authenticated;

CREATE INDEX IF NOT EXISTS idx_challenges_j18_abstract_due ON public.challenges(current_phase,abstract_deadline)
WHERE status IN ('PUBLISHED','EXTENDED') AND current_phase=5;
CREATE INDEX IF NOT EXISTS idx_challenges_j18_solution_due ON public.challenges(current_phase,solution_deadline)
WHERE status IN ('PUBLISHED','EXTENDED') AND current_phase IN (5,7);

DO $cron$
DECLARE v_job record;
BEGIN
  FOR v_job IN SELECT jobid FROM cron.job WHERE jobname IN ('j17-challenge-start','j17-j18-challenge-lifecycle') LOOP
    PERFORM cron.unschedule(v_job.jobid);
  END LOOP;
END;
$cron$;
SELECT cron.schedule(
  'j17-j18-challenge-lifecycle','*/5 * * * *',
  'SELECT private.run_challenge_start_job(); SELECT private.run_challenge_deadline_job();'
);