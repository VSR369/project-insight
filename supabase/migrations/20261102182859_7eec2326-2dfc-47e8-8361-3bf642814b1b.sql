-- DEF-0060 / BR-SEC-019 Solution confidentiality + deadline freeze

-- 1. Freeze columns
ALTER TABLE public.solutions
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_fingerprint text;
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS file_fingerprint text;

-- 2. PWA acceptance check (legal_acceptance_log, document_type 'PWA')
CREATE OR REPLACE FUNCTION public.fn_has_accepted_pwa(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_user_id IS DISTINCT FROM auth.uid() AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Access denied: cannot query another user''s acceptance status.';
  END IF;
  RETURN EXISTS (
    SELECT 1 FROM public.legal_acceptance_log l
    WHERE l.user_id = p_user_id AND l.document_code ILIKE 'PWA%'
  );
END $$;

-- 3. Core access decision: who may see an abstract/solution/submission
CREATE OR REPLACE FUNCTION public.fn_can_view_solution(
  p_challenge_id uuid,
  p_owner_id uuid,
  p_is_winner boolean
)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_me uuid := auth.uid();
  v_tenant uuid;
  v_status text;
  v_rec text[];
  v_conf text[];
BEGIN
  IF v_me IS NULL THEN RETURN false; END IF;
  -- the submitting provider always sees their own
  IF p_owner_id IS NOT NULL AND p_owner_id = v_me THEN RETURN true; END IF;

  SELECT c.tenant_id, c.status INTO v_tenant, v_status
  FROM public.challenges c WHERE c.id = p_challenge_id;
  IF NOT FOUND THEN RETURN false; END IF;

  -- platform admin acting on a recorded dispute/support case
  IF public.has_role(v_me, 'platform_admin'::app_role) AND EXISTS (
    SELECT 1 FROM public.dispute_records dr
    WHERE dr.challenge_id = p_challenge_id
      AND upper(COALESCE(dr.status,'')) IN ('RAISED','UNDER_REVIEW')
  ) THEN RETURN true; END IF;

  -- after the award the seeking organisation sees winning solutions in full
  IF p_is_winner
     AND v_status IN ('AWARDED','COMPLETED','DISPUTED')
     AND v_tenant IS NOT NULL
     AND v_tenant = public.get_user_tenant_id()
  THEN RETURN true; END IF;

  -- seeker/pool role holders: PWA must be accepted first
  IF public.fn_has_accepted_pwa(v_me) THEN
    -- assigned expert reviewers (legacy and new codes)
    IF EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = p_challenge_id AND ucr.user_id = v_me
        AND ucr.is_active AND ucr.role_code IN ('ER','R7_AGG','R7_MP')
    ) THEN RETURN true; END IF;
    -- award recommender and confirmer (OR-1)
    SELECT f.recommender_roles, f.confirmer_roles INTO v_rec, v_conf
    FROM public.fn_award_actor_roles(p_challenge_id) f;
    IF EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = p_challenge_id AND ucr.user_id = v_me
        AND ucr.is_active AND ucr.role_code = ANY (COALESCE(v_rec,'{}') || COALESCE(v_conf,'{}'))
    ) THEN RETURN true; END IF;
  END IF;

  RETURN false;
END $$;

-- 4. RLS: solutions (abstracts)
DROP POLICY IF EXISTS "Authenticated users can view solutions" ON public.solutions;
DROP POLICY IF EXISTS "Providers can update own solutions" ON public.solutions;
DROP POLICY IF EXISTS solutions_owner_select ON public.solutions;
DROP POLICY IF EXISTS solutions_privileged_select ON public.solutions;
DROP POLICY IF EXISTS solutions_owner_update ON public.solutions;
DROP POLICY IF EXISTS solutions_privileged_update ON public.solutions;

CREATE POLICY solutions_owner_select ON public.solutions FOR SELECT TO authenticated
  USING (provider_id = auth.uid());
CREATE POLICY solutions_privileged_select ON public.solutions FOR SELECT TO authenticated
  USING (public.fn_can_view_solution(challenge_id, provider_id, upper(COALESCE(selection_status,'')) = 'WINNER'));
CREATE POLICY solutions_owner_update ON public.solutions FOR UPDATE TO authenticated
  USING (provider_id = auth.uid()) WITH CHECK (provider_id = auth.uid());
CREATE POLICY solutions_privileged_update ON public.solutions FOR UPDATE TO authenticated
  USING (public.fn_can_view_solution(challenge_id, provider_id, false));

-- 5. RLS: challenge_submissions
DROP POLICY IF EXISTS submissions_privileged_select ON public.challenge_submissions;
DROP POLICY IF EXISTS submissions_owner_update ON public.challenge_submissions;
DROP POLICY IF EXISTS submissions_privileged_update ON public.challenge_submissions;

CREATE POLICY submissions_privileged_select ON public.challenge_submissions FOR SELECT TO authenticated
  USING (
    is_deleted = false AND public.fn_can_view_solution(
      challenge_id, user_id,
      upper(COALESCE(status,'')) = 'WINNER'
      OR EXISTS (
        SELECT 1 FROM public.challenge_award_lines al
        WHERE al.submission_id = challenge_submissions.id
          AND upper(al.line_status) IN ('CONFIRMED','ACCEPTED','PAID_SIMULATED')
      )
    )
  );
CREATE POLICY submissions_owner_update ON public.challenge_submissions FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY submissions_privileged_update ON public.challenge_submissions FOR UPDATE TO authenticated
  USING (public.fn_can_view_solution(challenge_id, user_id, false));

-- 6. RLS: evaluation_records (scores / ranks)
DROP POLICY IF EXISTS "Authenticated users can view evaluations" ON public.evaluation_records;
DROP POLICY IF EXISTS evaluations_reviewer_select ON public.evaluation_records;
DROP POLICY IF EXISTS evaluations_privileged_select ON public.evaluation_records;

CREATE POLICY evaluations_reviewer_select ON public.evaluation_records FOR SELECT TO authenticated
  USING (reviewer_id = auth.uid());
CREATE POLICY evaluations_privileged_select ON public.evaluation_records FOR SELECT TO authenticated
  USING (public.fn_can_view_solution(
    (SELECT s.challenge_id FROM public.solutions s WHERE s.id = evaluation_records.solution_id),
    NULL, false));

-- 7. Deadline freeze guards
CREATE OR REPLACE FUNCTION public.fn_guard_solution_freeze()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deadline timestamptz;
BEGIN
  SELECT c.submission_deadline INTO v_deadline
  FROM public.challenges c WHERE c.id = COALESCE(NEW.challenge_id, OLD.challenge_id);
  IF v_deadline IS NULL OR now() <= v_deadline THEN RETURN NEW; END IF;
  IF OLD.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    NEW.file_fingerprint := md5(
      coalesce(OLD.abstract_text,'') || '|' || coalesce(OLD.methodology,'') || '|' ||
      coalesce(OLD.timeline,'') || '|' || coalesce(OLD.experience,'') || '|' ||
      coalesce(OLD.full_solution_url,''));
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.provider_id IS NOT NULL AND auth.uid() = OLD.provider_id THEN
    RAISE EXCEPTION 'Submissions are frozen at the deadline and can no longer be edited.';
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.fn_guard_submission_freeze()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_deadline timestamptz;
BEGIN
  SELECT c.submission_deadline INTO v_deadline
  FROM public.challenges c WHERE c.id = COALESCE(NEW.challenge_id, OLD.challenge_id);
  IF v_deadline IS NULL OR now() <= v_deadline THEN RETURN NEW; END IF;
  IF OLD.frozen_at IS NULL THEN
    NEW.frozen_at := now();
    NEW.file_fingerprint := md5(
      coalesce(OLD.submission_text,'') || '|' ||
      coalesce(OLD.submission_files::text,'') || '|' || coalesce(OLD.submitter_email,''));
  END IF;
  IF auth.uid() IS NOT NULL AND OLD.user_id IS NOT NULL AND auth.uid() = OLD.user_id THEN
    RAISE EXCEPTION 'Submissions are frozen at the deadline and can no longer be edited.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_solutions_freeze ON public.solutions;
CREATE TRIGGER trg_solutions_freeze BEFORE UPDATE ON public.solutions
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_solution_freeze();
DROP TRIGGER IF EXISTS trg_challenge_submissions_freeze ON public.challenge_submissions;
CREATE TRIGGER trg_challenge_submissions_freeze BEFORE UPDATE ON public.challenge_submissions
  FOR EACH ROW EXECUTE FUNCTION public.fn_guard_submission_freeze();

-- 8. Bulk freeze + hourly schedule
CREATE OR REPLACE FUNCTION public.freeze_overdue_submissions()
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count integer := 0; v_n integer;
BEGIN
  UPDATE public.solutions s
  SET frozen_at = now(),
      file_fingerprint = md5(
        coalesce(s.abstract_text,'') || '|' || coalesce(s.methodology,'') || '|' ||
        coalesce(s.timeline,'') || '|' || coalesce(s.experience,'') || '|' || coalesce(s.full_solution_url,''))
  FROM public.challenges c
  WHERE s.challenge_id = c.id
    AND c.submission_deadline IS NOT NULL AND c.submission_deadline < now()
    AND s.frozen_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;

  UPDATE public.challenge_submissions s
  SET frozen_at = now(),
      file_fingerprint = md5(
        coalesce(s.submission_text,'') || '|' ||
        coalesce(s.submission_files::text,'') || '|' || coalesce(s.submitter_email,''))
  FROM public.challenges c
  WHERE s.challenge_id = c.id
    AND c.submission_deadline IS NOT NULL AND c.submission_deadline < now()
    AND s.frozen_at IS NULL;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_count := v_count + v_n;

  RETURN v_count;
END $$;

SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'freeze-submissions-hourly';
SELECT cron.schedule('freeze-submissions-hourly', '5 * * * *', $$SELECT public.freeze_overdue_submissions();$$);

-- 9. Secure view endpoints: record refusals in the audit trail
CREATE OR REPLACE FUNCTION public.get_solution_secure(p_solution_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_row public.solutions%ROWTYPE;
BEGIN
  SELECT * INTO v_row FROM public.solutions WHERE id = p_solution_id;
  IF NOT FOUND OR NOT public.fn_can_view_solution(
      v_row.challenge_id, v_row.provider_id, upper(COALESCE(v_row.selection_status,'')) = 'WINNER') THEN
    INSERT INTO public.audit_trail (challenge_id, solution_id, user_id, action, method, details, created_by)
    VALUES (v_row.challenge_id, p_solution_id, auth.uid(), 'SUBMISSION_ACCESS_DENIED', 'RPC',
            jsonb_build_object('resource','solutions','resource_id', p_solution_id), auth.uid());
    RETURN jsonb_build_object('allowed', false, 'error', 'You do not have access to this submission.');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'data', to_jsonb(v_row));
END $$;

CREATE OR REPLACE FUNCTION public.get_submission_secure(p_submission_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row public.challenge_submissions%ROWTYPE;
  v_winner boolean;
BEGIN
  SELECT * INTO v_row FROM public.challenge_submissions WHERE id = p_submission_id;
  v_winner := upper(COALESCE(v_row.status,'')) = 'WINNER' OR EXISTS (
    SELECT 1 FROM public.challenge_award_lines al
    WHERE al.submission_id = p_submission_id
      AND upper(al.line_status) IN ('CONFIRMED','ACCEPTED','PAID_SIMULATED'));
  IF NOT FOUND OR v_row.is_deleted OR NOT public.fn_can_view_solution(v_row.challenge_id, v_row.user_id, v_winner) THEN
    INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
    VALUES (v_row.challenge_id, auth.uid(), 'SUBMISSION_ACCESS_DENIED', 'RPC',
            jsonb_build_object('resource','challenge_submissions','resource_id', p_submission_id), auth.uid());
    RETURN jsonb_build_object('allowed', false, 'error', 'You do not have access to this submission.');
  END IF;
  RETURN jsonb_build_object('allowed', true, 'data', to_jsonb(v_row));
END $$;

-- 10. Grants
REVOKE EXECUTE ON FUNCTION public.fn_has_accepted_pwa(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_can_view_solution(uuid, uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.fn_guard_solution_freeze() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_guard_submission_freeze() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.freeze_overdue_submissions() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_has_accepted_pwa(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_can_view_solution(uuid, uuid, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.freeze_overdue_submissions() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_solution_secure(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_submission_secure(uuid) TO authenticated, service_role;