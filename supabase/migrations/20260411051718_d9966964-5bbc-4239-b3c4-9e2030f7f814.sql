-- 1. Create SECURITY DEFINER helper to check active challenge role assignments
CREATE OR REPLACE FUNCTION public.has_active_challenge_role(p_challenge_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_challenge_roles
    WHERE challenge_id = p_challenge_id
      AND user_id = p_user_id
      AND is_active = true
  )
$$;

-- 2. Drop the existing ALL policy (covers SELECT/INSERT/UPDATE/DELETE)
DROP POLICY IF EXISTS "Tenant isolation challenges" ON public.challenges;

-- 3. SELECT: same-tenant OR platform_admin OR has active assignment
CREATE POLICY "challenges_select_policy"
ON public.challenges
FOR SELECT
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_active_challenge_role(id, auth.uid())
);

-- 4. INSERT: same-tenant only
CREATE POLICY "challenges_insert_policy"
ON public.challenges
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_user_tenant_id()
);

-- 5. UPDATE: same-tenant OR platform_admin OR has active assignment
CREATE POLICY "challenges_update_policy"
ON public.challenges
FOR UPDATE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_active_challenge_role(id, auth.uid())
)
WITH CHECK (
  tenant_id = get_user_tenant_id()
  OR has_role(auth.uid(), 'platform_admin'::app_role)
  OR has_active_challenge_role(id, auth.uid())
);

-- 6. DELETE: same-tenant OR platform_admin only
CREATE POLICY "challenges_delete_policy"
ON public.challenges
FOR DELETE
TO authenticated
USING (
  tenant_id = get_user_tenant_id()
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);