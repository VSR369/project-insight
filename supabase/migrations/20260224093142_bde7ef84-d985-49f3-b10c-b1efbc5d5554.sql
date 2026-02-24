
-- Fix: Add registration-phase RLS policies for seeker_billing_info
-- Root cause: upsert fails because UPDATE/SELECT policies require tenant_id = get_user_tenant_id()
-- which returns NULL for pre-tenant registration users.
-- This mirrors the pattern on seeker_compliance, seeker_contacts, seeker_organizations.

-- 1. Permissive UPDATE policy for registration phase
CREATE POLICY "Registration update seeker_billing_info"
ON public.seeker_billing_info
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 2. Permissive SELECT policy for registration phase
CREATE POLICY "Registration select seeker_billing_info"
ON public.seeker_billing_info
FOR SELECT
TO anon, authenticated
USING (true);
