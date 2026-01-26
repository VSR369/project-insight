-- =====================================================
-- Add UPDATE policies for reviewers on booking tables
-- Enables accept/decline interview slot functionality
-- =====================================================

-- 1. Allow reviewers to update their own booking_reviewers assignment
CREATE POLICY "Reviewers can update own acceptance status"
ON public.booking_reviewers
FOR UPDATE
TO authenticated
USING (
  reviewer_id IN (
    SELECT id FROM panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  reviewer_id IN (
    SELECT id FROM panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 2. Allow reviewers to update interview bookings they are assigned to
CREATE POLICY "Reviewers can update assigned bookings"
ON public.interview_bookings
FOR UPDATE
TO authenticated
USING (is_reviewer_assigned_to_booking(id))
WITH CHECK (is_reviewer_assigned_to_booking(id));

-- 3. Allow reviewers to update enrollment lifecycle when declining
-- (for poor_credentials or reviewer_unavailable scenarios)
CREATE POLICY "Reviewers can update assigned enrollment lifecycle"
ON public.provider_industry_enrollments
FOR UPDATE
TO authenticated
USING (is_reviewer_for_enrollment(id))
WITH CHECK (is_reviewer_for_enrollment(id));