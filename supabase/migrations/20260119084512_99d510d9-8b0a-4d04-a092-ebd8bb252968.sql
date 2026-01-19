-- =====================================================
-- Reviewer Dashboard Support: Add review tracking columns
-- =====================================================

-- Add clarification flag and reviewer notes to interview_bookings
ALTER TABLE public.interview_bookings
  ADD COLUMN IF NOT EXISTS flag_for_clarification BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reviewer_notes TEXT,
  ADD COLUMN IF NOT EXISTS interview_outcome VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN public.interview_bookings.flag_for_clarification IS 'Flag set by reviewer when clarification is needed from provider';
COMMENT ON COLUMN public.interview_bookings.reviewer_notes IS 'Internal notes from reviewer about the interview or enrollment';
COMMENT ON COLUMN public.interview_bookings.interview_outcome IS 'Outcome: pending, passed, needs_clarification, failed';

-- Performance indexes for dashboard queries
CREATE INDEX IF NOT EXISTS idx_booking_reviewers_reviewer_status 
  ON public.booking_reviewers(reviewer_id, status);

CREATE INDEX IF NOT EXISTS idx_interview_bookings_enrollment_status
  ON public.interview_bookings(enrollment_id, status, scheduled_at);

CREATE INDEX IF NOT EXISTS idx_interview_bookings_status_scheduled
  ON public.interview_bookings(status, scheduled_at)
  WHERE status IN ('scheduled', 'confirmed');

CREATE INDEX IF NOT EXISTS idx_interview_bookings_created_at
  ON public.interview_bookings(created_at DESC);