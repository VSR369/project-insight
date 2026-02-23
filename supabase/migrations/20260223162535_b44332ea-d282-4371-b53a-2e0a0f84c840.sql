-- Drop the ALL policy that conflicts with INSERT during registration
DROP POLICY IF EXISTS "Tenant isolation seeker_compliance" ON public.seeker_compliance;

-- Allow inserts during pre-auth registration
CREATE POLICY "Registration insert seeker_compliance" ON public.seeker_compliance
  FOR INSERT
  WITH CHECK (true);

-- Separate SELECT/UPDATE/DELETE policies for tenant isolation
CREATE POLICY "Tenant isolation select seeker_compliance" ON public.seeker_compliance
  FOR SELECT
  USING (
    tenant_id = get_user_tenant_id()
    OR has_role(auth.uid(), 'platform_admin'::app_role)
    OR TRUE
  );

CREATE POLICY "Tenant isolation update seeker_compliance" ON public.seeker_compliance
  FOR UPDATE
  USING (
    tenant_id = get_user_tenant_id()
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );

CREATE POLICY "Tenant isolation delete seeker_compliance" ON public.seeker_compliance
  FOR DELETE
  USING (
    tenant_id = get_user_tenant_id()
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );