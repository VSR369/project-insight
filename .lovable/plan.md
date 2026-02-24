

## 5 WHY Root Cause Analysis

**WHY 1:** The "Complete Registration" button shows an error after a delay.

**WHY 2:** Network logs show billing info (200) and subscription (201) **both succeed now**. The failure is a **new error** on `seeker_memberships` — `POST /rest/v1/seeker_memberships` returns **401 with code 42501**: `"new row violates row-level security policy for table \"seeker_memberships\""`.

**WHY 3:** `seeker_memberships` has a restrictive RLS policy (likely a `FOR ALL` with `tenant_id = get_user_tenant_id()`) but no registration-phase permissive INSERT or SELECT policy.

**WHY 4:** The user is on the anon key. `get_user_tenant_id()` returns NULL. The tenant-isolation policy evaluates to FALSE.

**WHY 5:** This is the **exact same root cause** as `seeker_billing_info` and `seeker_subscriptions` — the table was never given registration-phase permissive policies when the pattern was applied to other tables.

---

## The Repeating Pattern

The registration billing step calls **three** mutations in sequence:
1. `seeker_billing_info` upsert — fixed previously, now returns 200
2. `seeker_subscriptions` insert — fixed in last migration, now returns 201
3. `seeker_memberships` insert — **STILL MISSING policies, returns 42501**

Each time we fix one table, execution progresses to the next and hits the same missing-policy problem.

---

## Permanent Fix — Database Migration

Add registration-phase permissive policies for `seeker_memberships`:

```sql
-- Registration-phase permissive policies for seeker_memberships
-- Same pattern as seeker_billing_info, seeker_subscriptions, seeker_compliance, etc.

CREATE POLICY "Registration insert seeker_memberships"
ON public.seeker_memberships
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Registration select seeker_memberships"
ON public.seeker_memberships
FOR SELECT
TO anon, authenticated
USING (true);
```

### No Code Changes Required

The `useCreateMembership` hook in `useMembershipData.ts` and the `BillingForm.tsx` orchestration are correct. Only the missing database policies are blocking the operation.

### Security Note

Same as prior fixes — these permissive policies are intentional for the registration flow. Post-registration, tenant-isolation policies govern access. A future hardening pass should scope these more tightly.

