CREATE POLICY "creator_can_delete_digest"
ON public.challenge_context_digest
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM challenges c
    WHERE c.id = challenge_context_digest.challenge_id
    AND c.created_by = auth.uid()
  )
);