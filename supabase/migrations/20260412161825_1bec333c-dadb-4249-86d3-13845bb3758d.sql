-- Fix context digest RLS: use user_challenge_roles for curator check
-- The old policies checked challenge_role_assignments.role_code IN ('CU','SA','PA')
-- but that table stores SLM codes (R5_MP, R7_AGG, etc.), never 'CU'.

DROP POLICY IF EXISTS "curator_can_update_digest" ON public.challenge_context_digest;
DROP POLICY IF EXISTS "curator_can_delete_digest" ON public.challenge_context_digest;

-- UPDATE policy: curator via user_challenge_roles OR platform admin via challenge_role_assignments
CREATE POLICY "curator_can_update_digest"
  ON public.challenge_context_digest
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = challenge_context_digest.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.role_code = 'CU'
        AND ucr.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.challenge_role_assignments cra
      WHERE cra.challenge_id = challenge_context_digest.challenge_id
        AND cra.pool_member_id IN (
          SELECT pp.id FROM public.platform_provider_pool pp
          WHERE pp.user_id = auth.uid()
        )
        AND cra.role_code IN ('SA', 'PA')
        AND cra.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = challenge_context_digest.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.role_code = 'CU'
        AND ucr.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.challenge_role_assignments cra
      WHERE cra.challenge_id = challenge_context_digest.challenge_id
        AND cra.pool_member_id IN (
          SELECT pp.id FROM public.platform_provider_pool pp
          WHERE pp.user_id = auth.uid()
        )
        AND cra.role_code IN ('SA', 'PA')
        AND cra.status = 'active'
    )
  );

-- DELETE policy: same predicate, no WITH CHECK needed
CREATE POLICY "curator_can_delete_digest"
  ON public.challenge_context_digest
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_challenge_roles ucr
      WHERE ucr.challenge_id = challenge_context_digest.challenge_id
        AND ucr.user_id = auth.uid()
        AND ucr.role_code = 'CU'
        AND ucr.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.challenge_role_assignments cra
      WHERE cra.challenge_id = challenge_context_digest.challenge_id
        AND cra.pool_member_id IN (
          SELECT pp.id FROM public.platform_provider_pool pp
          WHERE pp.user_id = auth.uid()
        )
        AND cra.role_code IN ('SA', 'PA')
        AND cra.status = 'active'
    )
  );