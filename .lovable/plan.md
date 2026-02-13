

# Unique Organization Identification -- Country Required + Composite Unique Constraint

## Summary

Add a hard unique constraint on `(LOWER(organization_name), hq_country_id)` in the database and make Country a required field in the child org creation form. This prevents exact-name duplicates within the same country at the database level, while the existing trigram fuzzy check catches near-matches as an advisory warning.

## Changes

### 1. Database Migration

Add a composite unique index on `seeker_organizations`:

```sql
CREATE UNIQUE INDEX idx_seeker_orgs_unique_name_country
  ON public.seeker_organizations (LOWER(organization_name::text), hq_country_id)
  WHERE is_deleted = false;
```

This is a **partial unique index** -- it only enforces uniqueness among non-deleted records, allowing soft-deleted orgs to share names.

### 2. Schema Update (`saasAgreement.schema.ts`)

Make `hq_country_id` required in `childOrgSchema`:

```text
Before:  hq_country_id: z.string().uuid().optional().nullable()
After:   hq_country_id: z.string().uuid("Please select a country")
```

### 3. UI Update (`CreateChildOrgDialog.tsx`)

- Mark the Country field label with `*` (required indicator)
- No other UI changes needed -- the form already renders a country selector

### 4. Error Handling

- If the unique constraint is violated (exact duplicate name + country), the mutation's `onError` handler already shows a toast. The error message from Postgres will mention the constraint -- we can intercept it and show a friendlier message like "An organization with this name already exists in the selected country."

## Files Changed

| File | Change |
|---|---|
| New migration SQL | Add partial unique index `idx_seeker_orgs_unique_name_country` |
| `src/pages/admin/saas/saasAgreement.schema.ts` | Make `hq_country_id` required (non-nullable) in `childOrgSchema` |
| `src/components/admin/CreateChildOrgDialog.tsx` | Add required indicator `*` to Country label |
| `src/hooks/queries/useSaasData.ts` | Add friendly duplicate error message handling in `useCreateChildOrg` `onError` |

## How It Works Together

```text
User submits "ACME Corp" + "United States"
  --> Step 1: Trigram fuzzy check (advisory)
      - Finds "Acme Corporation" at 0.65 similarity
      - Shows DuplicateOrgModal warning
      - User clicks "Proceed Anyway"
  --> Step 2: INSERT hits DB
      - If exact "acme corp" + US already exists (non-deleted):
        DB rejects with unique constraint violation
        Toast: "An organization with this name already exists in the selected country"
      - Otherwise: inserted successfully
```

Two layers of protection: fuzzy warning (soft) + exact constraint (hard).

