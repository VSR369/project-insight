
-- Issue 1: Fix registration_payments RLS policy to use has_role()
DROP POLICY IF EXISTS "tenant_isolation_registration_payments" ON public.registration_payments;

CREATE POLICY "tenant_isolation_registration_payments" ON public.registration_payments
  FOR ALL
  USING (
    organization_id IN (
      SELECT id FROM seeker_organizations WHERE id = organization_id
    )
    OR has_role(auth.uid(), 'platform_admin'::app_role)
  );

-- Issue 2: Add missing GRANT for anon and authenticated on registration_payments
GRANT SELECT, INSERT ON public.registration_payments TO anon, authenticated;

-- Issue 3: Fix md_system_config modify policy to use has_role()
DROP POLICY IF EXISTS "platform_admin_modify_system_config" ON public.md_system_config;

CREATE POLICY "platform_admin_modify_system_config" ON public.md_system_config
  FOR ALL
  USING (has_role(auth.uid(), 'platform_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));
