
-- Defense-in-depth: Allow users to read their own membership records directly
-- This breaks the circular dependency where tenant isolation policy relies on get_user_tenant_id()
CREATE POLICY "Users read own memberships"
  ON public.org_users
  FOR SELECT
  USING (user_id = auth.uid());

-- Defense-in-depth: Allow org members to read their organization's data
CREATE POLICY "Org members read own org"
  ON public.seeker_organizations
  FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM public.org_users
      WHERE user_id = auth.uid() AND is_active = TRUE
    )
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );
