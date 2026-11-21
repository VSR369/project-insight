DROP POLICY IF EXISTS audit_trail_select ON public.audit_trail;
CREATE POLICY audit_trail_select ON public.audit_trail
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'platform_admin'::public.app_role)
  OR (challenge_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.user_challenge_roles ucr
        WHERE ucr.challenge_id = audit_trail.challenge_id
          AND ucr.user_id = auth.uid()
          AND ucr.is_active = true))
);
REVOKE SELECT ON public.audit_trail FROM anon;