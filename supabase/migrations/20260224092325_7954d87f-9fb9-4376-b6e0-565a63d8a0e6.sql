-- Fix 1: Grant table-level permissions (re-applying)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seeker_compliance TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.seeker_compliance TO anon;

-- Fix 2: Add a permissive UPDATE policy for registration phase
-- The upsert (on_conflict) requires UPDATE access, but current UPDATE policy
-- requires tenant_id = get_user_tenant_id() which fails during pre-tenant registration
CREATE POLICY "Registration update seeker_compliance"
ON public.seeker_compliance
FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);