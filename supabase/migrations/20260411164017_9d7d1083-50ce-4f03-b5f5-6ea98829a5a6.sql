
-- Add curator edit tracking columns
ALTER TABLE public.challenge_context_digest
  ADD COLUMN IF NOT EXISTS curator_edited BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS curator_edited_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS original_digest_text TEXT;

-- RLS: curator can update digest_text for challenges they are assigned to
CREATE POLICY "curator_can_update_digest"
  ON public.challenge_context_digest
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.challenge_role_assignments cra
      WHERE cra.challenge_id = challenge_context_digest.challenge_id
        AND cra.pool_member_id IN (
          SELECT pp.id FROM public.platform_provider_pool pp WHERE pp.user_id = auth.uid()
        )
        AND cra.role_code IN ('CU', 'SA', 'PA')
        AND cra.status = 'active'
    )
  )
  WITH CHECK (true);
