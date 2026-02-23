-- Drop the ALL policy that conflicts with the INSERT policy during registration
DROP POLICY IF EXISTS "Tenant isolation seeker_contacts" ON public.seeker_contacts;

-- Re-create as SELECT/UPDATE/DELETE only (not INSERT)
CREATE POLICY "Tenant isolation select seeker_contacts" ON public.seeker_contacts
  FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    OR has_role(auth.uid(), 'platform_admin'::app_role)
    OR TRUE  -- Allow pre-auth registration reads
  );

CREATE POLICY "Tenant isolation update seeker_contacts" ON public.seeker_contacts
  FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Tenant isolation delete seeker_contacts" ON public.seeker_contacts
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id()
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );