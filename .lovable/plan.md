

# Security Scan Results: `registration_payments` & `md_system_config`

## Scan Summary

The Supabase linter and security scanner identified **1 finding specific to these tables** plus **2 issues found via manual policy inspection**.

---

## Findings

### Issue 1 — CRITICAL: No GRANT permissions for `anon` on `registration_payments`

The `information_schema.role_table_grants` query returned **zero rows** for both tables for `anon` and `authenticated` roles. This means:

- `BillingForm.tsx` (line 260) does a raw `supabase.from('registration_payments').insert(...)` during **unauthenticated** registration
- Without `GRANT INSERT` for `anon`, this insert silently fails (the `catch {}` on line 272 swallows the error)
- Payment records are **never created**, so the V1 verification check in the admin workflow has no data

**Fix:** Add `GRANT SELECT, INSERT ON public.registration_payments TO anon, authenticated;` — matching the pattern already used for `seeker_billing_info`, `seeker_subscriptions`, and other registration-critical tables.

### Issue 2 — CRITICAL: `registration_payments` RLS policy queries `user_roles` directly

The current policy `tenant_isolation_registration_payments` contains:
```sql
JOIN user_roles ur ON (ur.user_id = auth.uid()) WHERE (ur.role = 'platform_admin')
```

Per project standards, this **must** use the `has_role()` SECURITY DEFINER function to prevent potential infinite recursion if `user_roles` ever gets its own RLS policies that reference other tables.

**Fix:** Replace with `has_role(auth.uid(), 'platform_admin'::app_role)`.

### Issue 3 — MEDIUM: `md_system_config` modify policy queries `user_roles` directly

The `platform_admin_modify_system_config` policy uses:
```sql
EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'platform_admin')
```

Same issue as above — should use `has_role()`.

**Fix:** Replace with `has_role(auth.uid(), 'platform_admin'::app_role)`.

### Issue 4 — INFORMATIONAL: `md_system_config` SELECT policy uses `USING (true)`

The scanner flagged `platform_admin_read_system_config` as always-true. This is **intentional** — config values like `max_correction_cycles` and `min_rejection_reason_length` are non-sensitive operational parameters needed during unauthenticated registration flows. **No change needed.**

### Issue 5 — MINOR: `BillingForm.tsx` uses raw insert instead of `useCreateRegistrationPayment` hook

The existing hook in `useRegistrationPayments.ts` already applies `withCreatedBy()` for audit fields. The raw insert in `BillingForm.tsx` skips this. When the GRANT fix enables the insert to actually succeed, payment records will be missing `created_by`.

**Fix:** Wire the `useCreateRegistrationPayment` hook into `BillingForm.tsx`.

---

## Implementation Plan

### Migration (1 file)
1. Drop and recreate `registration_payments` RLS policy using `has_role()` function
2. Drop and recreate `md_system_config` modify policy using `has_role()` function
3. Add `GRANT SELECT, INSERT ON public.registration_payments TO anon, authenticated`

### Code (1 file)
4. Update `BillingForm.tsx` to use `useCreateRegistrationPayment` hook instead of raw Supabase insert (adds audit fields via `withCreatedBy`)

### No Change
5. `md_system_config` SELECT `USING (true)` — intentional, documented as accepted risk

| Issue | Severity | Action |
|-------|----------|--------|
| Missing GRANT on `registration_payments` | Critical | Migration |
| `registration_payments` RLS uses direct `user_roles` query | Critical | Migration |
| `md_system_config` modify uses direct `user_roles` query | Medium | Migration |
| `md_system_config` SELECT `true` | Intentional | No change |
| Raw insert missing audit fields | Minor | Code fix |

