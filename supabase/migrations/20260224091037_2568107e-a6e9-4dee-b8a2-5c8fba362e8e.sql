-- Split the ALL policy into SELECT/UPDATE/DELETE + add permissive INSERT for registration
-- Same pattern as seeker_contacts and seeker_compliance (registration RLS bypass)

-- Drop existing ALL policy
DROP POLICY IF EXISTS "Tenant isolation seeker_billing_info" ON public.seeker_billing_info;

-- Recreate as SELECT policy (tenant-scoped reads)
CREATE POLICY "Tenant read seeker_billing_info"
ON public.seeker_billing_info
FOR SELECT
USING (
  (tenant_id = get_user_tenant_id())
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

-- UPDATE policy (tenant-scoped)
CREATE POLICY "Tenant update seeker_billing_info"
ON public.seeker_billing_info
FOR UPDATE
USING (
  (tenant_id = get_user_tenant_id())
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

-- DELETE policy (tenant-scoped)
CREATE POLICY "Tenant delete seeker_billing_info"
ON public.seeker_billing_info
FOR DELETE
USING (
  (tenant_id = get_user_tenant_id())
  OR has_role(auth.uid(), 'platform_admin'::app_role)
);

-- Permissive INSERT for registration (user not yet tenant-mapped)
CREATE POLICY "Allow insert seeker_billing_info during registration"
ON public.seeker_billing_info
FOR INSERT
WITH CHECK (true);