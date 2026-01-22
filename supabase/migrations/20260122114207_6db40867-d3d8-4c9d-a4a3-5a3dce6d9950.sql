-- Allow reviewers to view interview bookings where they are assigned
CREATE POLICY "Reviewers can view assigned bookings"
  ON public.interview_bookings
  FOR SELECT
  USING (
    id IN (
      SELECT br.booking_id 
      FROM booking_reviewers br
      JOIN panel_reviewers pr ON pr.id = br.reviewer_id
      WHERE pr.user_id = auth.uid() 
        AND pr.is_active = true
    )
  );