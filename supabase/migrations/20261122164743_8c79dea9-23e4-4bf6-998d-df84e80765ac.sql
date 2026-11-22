-- lovable-cron-fallback-reviewed: J17 explicitly requires a five-minute start-date check; no delayed-workflow provider is enabled, and J18 will share this single polling job.
CREATE OR REPLACE FUNCTION private.fn_hold_future_challenge_publication()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.current_phase = 4
     AND OLD.current_phase IS DISTINCT FROM 4
     AND NEW.start_at IS NOT NULL
     AND NEW.start_at > now() THEN
    NEW.status := 'SCHEDULED';
    NEW.published_at := NULL;
    NEW.challenge_visibility := 'private';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.fn_hold_future_challenge_publication() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_zz_future_challenge_publication ON public.challenges;
CREATE TRIGGER trg_zz_future_challenge_publication
BEFORE UPDATE OF current_phase ON public.challenges
FOR EACH ROW EXECUTE FUNCTION private.fn_hold_future_challenge_publication();

DO $patch$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef('public.complete_phase(uuid,uuid)'::regprocedure)
    INTO v_definition;

  v_old := $old$  v_same_actor := COALESCE(v_next_config.auto_complete, false)
    OR (v_next_config.required_role IS NOT NULL
        AND v_next_config.required_role = v_phase_config.required_role);$old$;
  v_new := $new$  v_same_actor := (COALESCE(v_next_config.auto_complete, false)
    OR (v_next_config.required_role IS NOT NULL
        AND v_next_config.required_role = v_phase_config.required_role))
    AND NOT (v_next_phase = 4 AND EXISTS (
      SELECT 1 FROM public.challenges c
      WHERE c.id = p_challenge_id AND c.start_at IS NOT NULL AND c.start_at > now()
    ));$new$;

  IF position(v_old in v_definition) = 0 THEN
    RAISE EXCEPTION 'J17 complete_phase patch target not found';
  END IF;

  EXECUTE replace(v_definition, v_old, v_new);
END;
$patch$;

UPDATE public.md_lifecycle_phase_config
SET is_active = true,
    auto_complete = true,
    required_role = NULL,
    secondary_role = NULL,
    phase_type = 'system_auto',
    sla_days = 0
WHERE governance_mode = 'QUICK' AND phase_number IN (5, 6);

CREATE INDEX IF NOT EXISTS idx_challenges_j17_due
ON public.challenges (status, current_phase, start_at)
WHERE status = 'SCHEDULED';

CREATE OR REPLACE FUNCTION private.run_challenge_start_job()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c record;
  v_governance text;
  v_escrow_mode text;
  v_prize_pool numeric;
  v_failure text;
  v_result jsonb;
  v_published integer := 0;
  v_failed integer := 0;
  v_notified integer := 0;
BEGIN
  FOR c IN
    SELECT id, title, created_by, start_at, current_phase,
           lc_compliance_complete, fc_compliance_complete,
           COALESCE(governance_mode_override, governance_profile, 'STRUCTURED') AS governance_mode,
           COALESCE((reward_structure->>'platinum_award')::numeric, 0) AS prize_pool
    FROM public.challenges
    WHERE status = 'SCHEDULED'
      AND current_phase = 4
      AND phase_status = 'ACTIVE'
      AND start_at IS NOT NULL
      AND start_at <= now()
    ORDER BY start_at
    FOR UPDATE SKIP LOCKED
  LOOP
    v_governance := CASE WHEN c.governance_mode IN ('LIGHTWEIGHT','QUICK') THEN 'QUICK'
                         WHEN c.governance_mode IN ('ENTERPRISE','CONTROLLED') THEN 'CONTROLLED'
                         ELSE 'STRUCTURED' END;
    v_prize_pool := c.prize_pool;
    v_failure := NULL;

    SELECT escrow_mode INTO v_escrow_mode
    FROM public.md_governance_mode_config
    WHERE governance_mode = v_governance AND is_active = true
    LIMIT 1;

    IF v_governance IN ('STRUCTURED','CONTROLLED') AND NOT COALESCE(c.lc_compliance_complete, false) THEN
      v_failure := 'Legal compliance is incomplete.';
    ELSIF v_governance IN ('STRUCTURED','CONTROLLED') AND NOT COALESCE(c.fc_compliance_complete, false) THEN
      v_failure := 'Financial compliance is incomplete.';
    ELSIF COALESCE(v_escrow_mode, '') = 'mandatory_escrow'
      AND v_prize_pool > 0
      AND NOT public.challenge_escrow_installments_funded(c.id) THEN
      v_failure := 'Required escrow is not funded.';
    END IF;

    IF v_failure IS NULL THEN
      BEGIN
        v_result := public.complete_phase(c.id, c.created_by);
        UPDATE public.challenges
        SET status = 'PUBLISHED',
            published_at = COALESCE(published_at, now()),
            challenge_visibility = 'public',
            updated_at = now()
        WHERE id = c.id;

        INSERT INTO public.audit_trail (challenge_id, user_id, action, method, phase_from, phase_to, details, created_by)
        VALUES (c.id, c.created_by, 'CHALLENGE_PUBLISHED', 'SYSTEM', 4,
                (v_result->>'current_phase')::integer,
                jsonb_build_object('job', 'J17', 'scheduled_start', c.start_at), c.created_by);

        IF c.created_by IS NOT NULL THEN
          INSERT INTO public.cogni_notifications
            (user_id, challenge_id, notification_type, title, message, action_url)
          VALUES (c.created_by, c.id, 'CHALLENGE_PUBLISHED', 'Challenge published',
                  '"' || c.title || '" has reached its start date-time and is now published.',
                  '/cogni/challenges/' || c.id || '/view');
        END IF;
        v_published := v_published + 1;
      EXCEPTION WHEN OTHERS THEN
        v_failure := SQLERRM;
      END;
    END IF;

    IF v_failure IS NOT NULL THEN
      v_failed := v_failed + 1;
      INSERT INTO public.cogni_notifications
        (user_id, challenge_id, notification_type, title, message, action_url)
      SELECT DISTINCT recipients.user_id, c.id, 'PUBLICATION_GATE_FAILED',
             'Challenge publication blocked',
             '"' || c.title || '" remains Scheduled. Failed gate: ' || v_failure,
             '/cogni/challenges/' || c.id || '/manage'
      FROM (
        SELECT c.created_by AS user_id
        UNION
        SELECT pp.user_id
        FROM public.challenge_role_assignments cra
        JOIN public.platform_provider_pool pp ON pp.id = cra.pool_member_id
        WHERE cra.challenge_id = c.id AND cra.role_code = 'CU' AND cra.status = 'ACTIVE'
      ) recipients
      WHERE recipients.user_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM public.cogni_notifications existing
          WHERE existing.user_id = recipients.user_id
            AND existing.challenge_id = c.id
            AND existing.notification_type = 'PUBLICATION_GATE_FAILED'
            AND existing.is_read = false
            AND existing.message = '"' || c.title || '" remains Scheduled. Failed gate: ' || v_failure
        );
      GET DIAGNOSTICS v_notified = ROW_COUNT;

      IF v_notified > 0 THEN
        INSERT INTO public.audit_trail (challenge_id, user_id, action, method, details, created_by)
        VALUES (c.id, c.created_by, 'PUBLICATION_GATE_FAILED', 'SYSTEM',
                jsonb_build_object('job', 'J17', 'failed_gate', v_failure, 'scheduled_start', c.start_at),
                c.created_by);
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('published', v_published, 'failed', v_failed, 'ran_at', now());
END;
$$;

REVOKE ALL ON FUNCTION private.run_challenge_start_job() FROM PUBLIC, anon, authenticated;

DO $cron$
DECLARE v_job_id bigint;
BEGIN
  SELECT jobid INTO v_job_id FROM cron.job WHERE jobname = 'j17-challenge-start';
  IF v_job_id IS NOT NULL THEN PERFORM cron.unschedule(v_job_id); END IF;
END;
$cron$;

SELECT cron.schedule('j17-challenge-start', '*/5 * * * *', 'SELECT private.run_challenge_start_job();');