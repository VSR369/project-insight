

# Duplicate Prevention and Unique Identification for Organizations

## Current State

| Check | Status |
|---|---|
| Parent org excluded from child org dropdown | Already implemented (line 96 of SaasAgreementPage) |
| Duplicate detection DB function | Exists: `check_duplicate_organization()` with trigram similarity > 0.4 |
| Duplicate check on child org creation | Missing -- form submits directly without checking |
| Duplicate check on parent org selection | Not applicable -- parent is selected from existing orgs, not created here |
| Unique constraint on `organization_name` | None -- only a GIN trigram index for search |

## What Needs to Be Done

### 1. Add Duplicate Check Before Child Org Creation

When the user submits the "Add Child Organization" form, call the existing `check_duplicate_organization()` RPC before inserting. If similar names are found, show the existing `DuplicateOrgModal` warning dialog, letting the user either go back or proceed anyway.

**Flow:**

```text
User fills child org form --> Submit
  --> Call check_duplicate_organization(name, country_id)
  --> If matches found:
      --> Show DuplicateOrgModal with closest match name
      --> "Go Back" = return to form
      --> "Proceed Anyway" = insert the org
  --> If no matches:
      --> Insert directly
```

### 2. Add a Duplicate-Check Hook

Create a reusable hook `useCheckDuplicateOrg` in `useSaasData.ts` that calls the RPC:

```typescript
const { data } = await supabase.rpc('check_duplicate_organization', {
  p_org_name: orgName,
  p_country_id: countryId ?? null,
  p_exclude_id: null
});
```

Returns an array of matches with `id`, `organization_name`, and `similarity_score`.

### 3. Integrate DuplicateOrgModal into CreateChildOrgDialog

- Import the existing `DuplicateOrgModal` component (already built for registration)
- Add state for `duplicateCheckResult` and `showDuplicateWarning`
- On form submit: run duplicate check first, show modal if matches found, insert on "Proceed Anyway"

### 4. No Database Changes Needed

- The `check_duplicate_organization` function already exists
- No new unique constraints needed (exact duplicates in different countries/tenants are valid business scenarios; the trigram fuzzy check is the right approach)
- Parent org is already excluded from the child org dropdown

---

## Files Changed

| File | Change |
|---|---|
| `src/hooks/queries/useSaasData.ts` | Add `useCheckDuplicateOrg` mutation hook that calls `check_duplicate_organization` RPC |
| `src/components/admin/CreateChildOrgDialog.tsx` | Import `DuplicateOrgModal`, add duplicate check on submit, show warning modal before insert |

## Technical Details

- The `check_duplicate_organization(p_org_name, p_country_id, p_exclude_id)` function returns rows where `similarity > 0.4` (already tuned)
- The existing `DuplicateOrgModal` component accepts `open`, `onOpenChange`, `existingOrgName`, `onProceed`, `onCancel` props -- a perfect fit
- No schema or migration changes required
- Parent org filtering in the child dropdown is already working correctly

