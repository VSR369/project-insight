DROP POLICY IF EXISTS "creator_can_delete_digest" ON public.challenge_context_digest;

CREATE POLICY "curator_can_delete_digest"
ON public.challenge_context_digest
FOR DELETE TO authenticated
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
);