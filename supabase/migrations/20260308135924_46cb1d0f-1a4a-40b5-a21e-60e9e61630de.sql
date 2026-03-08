-- GAP-4: Schedule leave-reminder edge function daily at 8 AM UTC (BR-MPA-005d)
SELECT cron.schedule(
  'leave-reminder-daily',
  '0 8 * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://izwimkvabbvnqcrrubpf.supabase.co/functions/v1/leave-reminder',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6d2lta3ZhYmJ2bnFjcnJ1YnBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0MDQyMzUsImV4cCI6MjA4Mzk4MDIzNX0.CPRE3Orpzf-KwC_6gj_beDFHM_j97btaEDndOuWliN8"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
    ) AS request_id;
  $$
);
