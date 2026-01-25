-- Fix the reviewer_workload_distribution view to use SECURITY INVOKER
-- This ensures RLS policies are enforced based on the querying user
DROP VIEW IF EXISTS reviewer_workload_distribution;

CREATE VIEW reviewer_workload_distribution
WITH (security_invoker = true)
AS
SELECT 
  pr.id,
  pr.name,
  pr.email,
  pr.expertise_level_ids,
  pr.industry_segment_ids,
  get_reviewer_interview_count(pr.id, 30) AS interviews_30d,
  get_reviewer_interview_count(pr.id, 7) AS interviews_7d,
  get_reviewer_days_idle(pr.id) AS days_since_last,
  CASE 
    WHEN get_reviewer_days_idle(pr.id) > 14 THEN 'idle_alert'
    WHEN get_reviewer_interview_count(pr.id, 30) > 8 THEN 'overloaded'
    ELSE 'balanced'
  END AS workload_status,
  CASE 
    WHEN get_reviewer_interview_count(pr.id, 30) <= 2 THEN 'low'
    WHEN get_reviewer_interview_count(pr.id, 30) <= 5 THEN 'medium'
    ELSE 'high'
  END AS load_bucket
FROM panel_reviewers pr
WHERE pr.is_active = true
  AND pr.approval_status = 'approved'
ORDER BY interviews_30d DESC;