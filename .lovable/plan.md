

# Fix: Child Org Creation, SaaS Agreement Insert Errors, and RLS Policies

## Issues Found

### Issue 1: Non-Existent Columns on `seeker_organizations`

The `useCreateChildOrg` mutation tries to insert `contact_email`, `contact_phone`, and `contact_person_name` into `seeker_organizations`, but these columns do **not** exist on that table. This causes the "Could not find the 'contact_email' column" error.

**Fix options (choosing Option A):**

**Option A -- Remove unsupported fields from the mutation and form.** Since the `seeker_organizations` table doesn't have contact fields, strip them from `CreateChildOrgParams`, `childOrgSchema`, and `CreateChildOrgDialog.tsx`.

**Option B (not recommended now)** -- Add the columns via migration. This would require a schema change that may not align with the existing data model where contacts are stored in a separate `seeker_contacts` table.

### Issue 2: `starts_at` NOT NULL Constraint

The `starts_at` column on `saas_agreements` is `NOT NULL` with a default of `now()`. However, the form schema allows `starts_at` to be `null` and the mutation passes it explicitly, overriding the DB default. When the user submits without a start date, `null` is sent, violating the constraint.

**Fix:** In the mutation, strip `starts_at` from the payload if it is null/empty so the database default (`now()`) applies. Alternatively, set a client-side default of today's date.

### Issue 3: Missing INSERT RLS Policy on `saas_agreements`

The only write policy on `saas_agreements` is the admin ALL policy (`has_role(auth.uid(), 'platform_admin')`). If the logged-in user is a platform admin, this should work. However, if they aren't being recognized as a platform admin, inserts will fail silently due to RLS.

**Fix:** Verify the current user has the `platform_admin` role. Since this is an admin page, the existing admin ALL policy should be sufficient, but we should confirm it covers INSERT with a WITH CHECK clause. The current policy uses USING only (no WITH CHECK), which for ALL policies means the USING clause is applied to both -- this should work for admins. No RLS change needed if the user is indeed a platform admin.

---

## Implementation Plan

### Step 1: Fix `useCreateChildOrg` -- Remove Non-Existent Columns

**File: `src/hooks/queries/useSaasData.ts`**
- Remove `contact_person_name`, `contact_email`, `contact_phone` from `CreateChildOrgParams` interface
- These fields won't be sent to the database

### Step 2: Fix `childOrgSchema` -- Remove Non-Existent Fields

**File: `src/pages/admin/saas/saasAgreement.schema.ts`**
- Remove `contact_person_name`, `contact_email`, `contact_phone` from `childOrgSchema`

### Step 3: Fix `CreateChildOrgDialog.tsx` -- Remove Non-Existent Fields

**File: `src/components/admin/CreateChildOrgDialog.tsx`**
- Remove the Contact Person, Contact Phone, and Contact Email form fields from the dialog UI
- Keep: Organization Name, Legal Entity Name, Country, State, City, Postal Code, Address

### Step 4: Fix `starts_at` NULL Issue

**File: `src/hooks/queries/useSaasData.ts`**
- In `useCreateSaasAgreement` mutationFn, default `starts_at` to `new Date().toISOString()` when it is null/empty/undefined, so the NOT NULL constraint is never violated.

### Step 5: Fix null field stripping in mutations

**File: `src/hooks/queries/useSaasData.ts`**
- Strip null/undefined optional fields from the child org insert payload so PostgREST doesn't try to write non-existent columns.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/admin/saas/saasAgreement.schema.ts` | Remove `contact_person_name`, `contact_email`, `contact_phone` from `childOrgSchema` |
| `src/components/admin/CreateChildOrgDialog.tsx` | Remove Contact Person, Phone, and Email form fields from the dialog |
| `src/hooks/queries/useSaasData.ts` | Remove non-existent columns from `CreateChildOrgParams`; default `starts_at` to `now()` when null |

