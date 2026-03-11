-- Performance indexes for frequently filtered columns
-- Phase 3: Composite indexes to speed up common query patterns

CREATE INDEX IF NOT EXISTS idx_challenge_role_assignments_challenge_status
  ON public.challenge_role_assignments (challenge_id, status);

CREATE INDEX IF NOT EXISTS idx_platform_admin_verifications_admin_current_status
  ON public.platform_admin_verifications (assigned_admin_id, is_current, status);

CREATE INDEX IF NOT EXISTS idx_seeker_organizations_verification_deleted
  ON public.seeker_organizations (verification_status, is_deleted);

CREATE INDEX IF NOT EXISTS idx_open_queue_entries_claimed
  ON public.open_queue_entries (claimed_by)
  WHERE claimed_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_panel_reviewers_enrollment_approval
  ON public.panel_reviewers (enrollment_source, approval_status)
  WHERE approval_status = 'pending';

CREATE INDEX IF NOT EXISTS idx_reassignment_requests_status
  ON public.reassignment_requests (status)
  WHERE status = 'PENDING';
