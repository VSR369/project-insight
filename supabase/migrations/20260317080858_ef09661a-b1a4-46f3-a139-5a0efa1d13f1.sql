
-- Schedule hourly SLA breach check via pg_cron + pg_net
SELECT cron.schedule(
  'check-sla-breaches-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/check-sla-breaches',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := '{"source": "pg_cron"}'::jsonb
  ) AS request_id;
  $$
);
