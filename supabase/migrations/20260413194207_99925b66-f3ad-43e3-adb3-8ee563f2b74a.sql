-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- compute-performance-scores: daily at 02:00 UTC
SELECT cron.schedule(
  'compute-performance-scores-daily',
  '0 2 * * *',
  $$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/compute-performance-scores',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- expire-stale-invitations: daily at 03:00 UTC
SELECT cron.schedule(
  'expire-stale-invitations-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/expire-stale-invitations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- send-manager-reminder: daily at 09:00 UTC
SELECT cron.schedule(
  'send-manager-reminder-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/send-manager-reminder',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);

-- public-platform-stats: every 5 minutes
SELECT cron.schedule(
  'public-platform-stats-refresh',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/public-platform-stats',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
    body := concat('{"time": "', now(), '"}')::jsonb
  ) AS request_id;
  $$
);