
-- Allow authenticated users to delete legal docs they attached
CREATE POLICY "LC can delete legal docs they attached"
  ON public.challenge_legal_docs
  FOR DELETE
  TO authenticated
  USING (attached_by = auth.uid());
