-- =====================================================
-- Fix: Create missing time conflict checking functions
-- These are required by book_interview_slot and select_reviewers_weighted
-- =====================================================

-- 1. check_enrollment_time_conflict
-- Checks if an enrollment already has an active booking at the given time window
CREATE OR REPLACE FUNCTION public.check_enrollment_time_conflict(
  p_enrollment_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM interview_bookings ib
    WHERE ib.enrollment_id = p_enrollment_id
      AND ib.status IN ('scheduled', 'confirmed')
      AND ib.id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap: booking overlaps with [p_start_at, p_end_at]
      AND ib.scheduled_at < p_end_at
      AND (ib.scheduled_at + INTERVAL '60 minutes') > p_start_at
  )
$$;

-- 2. check_reviewer_time_conflict
-- Checks if a reviewer already has an assigned booking at the given time window
CREATE OR REPLACE FUNCTION public.check_reviewer_time_conflict(
  p_reviewer_id UUID,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM booking_reviewers br
    JOIN interview_slots ist ON ist.id = br.slot_id
    JOIN interview_bookings ib ON ib.id = br.booking_id
    WHERE ist.reviewer_id = p_reviewer_id
      AND br.status = 'assigned'
      AND ib.status IN ('scheduled', 'confirmed')
      AND ib.id != COALESCE(p_exclude_booking_id, '00000000-0000-0000-0000-000000000000'::uuid)
      -- Check time overlap: slot overlaps with [p_start_at, p_end_at]
      AND ist.start_at < p_end_at
      AND ist.end_at > p_start_at
  )
$$;

COMMENT ON FUNCTION check_enrollment_time_conflict IS 'Returns TRUE if the enrollment has an active booking overlapping the given time window';
COMMENT ON FUNCTION check_reviewer_time_conflict IS 'Returns TRUE if the reviewer has an assigned booking overlapping the given time window';