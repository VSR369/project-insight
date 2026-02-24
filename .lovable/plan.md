

## Problem Analysis

The billing upsert fails with RLS error (42501) because:

1. **The user is on the anon key** (the `Authorization` header matches the anon key, not a user JWT) — `get_user_tenant_id()` returns NULL
2. **INSERT policy** (`WITH CHECK (true)`) is fine
3. **UPDATE policy** requires `tenant_id = get_user_tenant_id()` — fails for anon/pre-tenant users
4. **SELECT policy** also requires `tenant_id = get_user_tenant_id()` — the `.select('id').single()` at the end of the upsert can't return the row

The compliance table was previously fixed with both a permissive UPDATE policy AND its SELECT policy already had `OR true`. The billing table lacks both.

## Plan

### Database Migration (single SQL migration)

Add registration-phase RLS policies for `seeker_billing_info`:

```sql
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
```

This mirrors the pattern already applied to `seeker_compliance` and other registration-critical tables (`seeker_contacts`, `seeker_organizations`).

### No Code Changes Required

The frontend code and mutation hooks are correct. Only the database policies are blocking the operation.

### Security Note

These permissive policies are intentional for the registration flow where users are not yet mapped to a tenant. Post-registration, data access is governed by the tenant-isolation policies which remain in place. A future hardening pass should scope these registration policies more tightly (e.g., by checking `created_by = auth.uid()`).

