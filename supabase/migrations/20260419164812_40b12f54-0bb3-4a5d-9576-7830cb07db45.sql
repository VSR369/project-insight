-- Schedule hourly enforcement jobs for LC review and Creator approval timeouts.
-- These call the deployed edge functions via pg_net.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Idempotent: unschedule prior versions if they exist.
DO $$
DECLARE
  job_id BIGINT;
BEGIN
  FOR job_id IN
    SELECT jobid FROM cron.job
    WHERE jobname IN ('enforce-lc-timeout-hourly', 'enforce-creator-approval-timeout-hourly')
  LOOP
    PERFORM cron.unschedule(job_id);
  END LOOP;
END $$;

-- Hourly LC review timeout enforcement.
SELECT cron.schedule(
  'enforce-lc-timeout-hourly',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/enforce-lc-timeout',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $job$
);

-- Hourly Creator approval 7-day timeout enforcement.
SELECT cron.schedule(
  'enforce-creator-approval-timeout-hourly',
  '0 * * * *',
  $job$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/enforce-creator-approval-timeout',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := jsonb_build_object('triggered_at', now())
  );
  $job$
);