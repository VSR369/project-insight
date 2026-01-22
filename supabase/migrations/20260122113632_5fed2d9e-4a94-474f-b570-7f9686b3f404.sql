-- Allow reviewers to view their own booking assignments
CREATE POLICY "Reviewers can view own assignments"
  ON public.booking_reviewers
  FOR SELECT
  USING (
    reviewer_id IN (
      SELECT pr.id 
      FROM panel_reviewers pr 
      WHERE pr.user_id = auth.uid() 
        AND pr.is_active = true
    )
  );