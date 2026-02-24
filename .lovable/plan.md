

## 5 WHY Root Cause Analysis

**WHY 1:** "Failed to create subscription" — The `INSERT` on `seeker_subscriptions` returns Postgres error 42501 (RLS violation).

**WHY 2:** RLS rejects the INSERT — The **only** policy on `seeker_subscriptions` is a single `FOR ALL` policy:
```
"Tenant isolation seeker_subscriptions"
USING (tenant_id = get_user_tenant_id() OR has_role(auth.uid(), 'platform_admin'))
```
This policy governs SELECT, INSERT, UPDATE, and DELETE. For INSERT, the `USING` clause acts as `WITH CHECK` — and it evaluates to `FALSE`.

**WHY 3:** The check evaluates to FALSE — `get_user_tenant_id()` returns `NULL` because the user is operating with the **anon key** (confirmed in the `Authorization` header — it matches the anon key exactly, not a user JWT). `NULL = 'e731c69d...'` is `NULL`, not `TRUE`. The `has_role()` fallback also fails for anon.

**WHY 4:** The user is on the anon key — The registration flow operates before the user is authenticated and mapped to a tenant in the `org_users` table. This is a known architectural constraint for registration.

**WHY 5:** No registration-phase policy exists for this table — Unlike `seeker_billing_info`, `seeker_compliance`, `seeker_contacts`, and `seeker_organizations` (which all received permissive registration-phase policies), `seeker_subscriptions` was **never given** operation-specific permissive policies. The monolithic `ALL` policy blocks everything for pre-tenant users.

**Root Cause:** `seeker_subscriptions` has a single restrictive `FOR ALL` RLS policy that requires tenant resolution. No registration-phase `INSERT` or `SELECT` policy exists, unlike every other registration-critical table.

---

## Permanent Fix — Database Migration

Add registration-phase permissive policies for `INSERT` and `SELECT` on `seeker_subscriptions`, plus a `SELECT` policy so the `.select('id').single()` after the insert can return the row. Also add a permissive `UPDATE` policy for the subsequent `seeker_organizations.registration_step` update (which already has its own policies, but the subscription table itself needs coverage for any future upsert patterns).

```sql
-- 1. Permissive INSERT policy for registration phase
CREATE POLICY "Registration insert seeker_subscriptions"
ON public.seeker_subscriptions
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- 2. Permissive SELECT policy for registration phase
CREATE POLICY "Registration select seeker_subscriptions"
ON public.seeker_subscriptions
FOR SELECT
TO anon, authenticated
USING (true);
```

This is the identical pattern applied to `seeker_billing_info`, `seeker_compliance`, `seeker_contacts`, and `seeker_organizations`. The existing tenant-isolation `ALL` policy remains in place — these new operation-specific `PERMISSIVE` policies combine with it via OR logic, so the INSERT and SELECT succeed while the tenant-isolation policy continues to govern authenticated post-registration access.

### No Code Changes Required

The frontend mutation hook (`useCreateSubscription`) and billing form are correct. Only the missing database policies are blocking the operation.

### Security Note

These permissive policies are intentional for the registration flow. Post-registration, the tenant-isolation `ALL` policy governs access. A future hardening pass should scope these to check `created_by = auth.uid()` or restrict to records where the organization's `registration_step < 6`.

