-- Add RLS policy for reviewers to manage their own slots
CREATE POLICY "Reviewers can manage own slots"
ON public.interview_slots
FOR ALL
TO authenticated
USING (
  reviewer_id IN (
    SELECT id FROM public.panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
)
WITH CHECK (
  reviewer_id IN (
    SELECT id FROM public.panel_reviewers 
    WHERE user_id = auth.uid() AND is_active = true
  )
);