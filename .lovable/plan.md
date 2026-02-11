

# Fix: Registration Data Loss on Back Navigation

## Root Cause Analysis

Two bugs cause data to disappear when navigating back to Step 1:

### Bug 1: Form never loads saved data
`OrganizationIdentityForm` always initializes `useForm` with empty `defaultValues`. When the user navigates back from Step 2, the component remounts and all fields are blank. The context already stores the data in `state.step1`, but nobody reads it.

### Bug 2: No update path -- only INSERT
`handleSubmit` always calls `useCreateOrganization()` which does an INSERT. When re-saving after navigating back:
- The duplicate check may flag the existing org
- Even if bypassed, a second org record would be created
- The old `organizationId` in context becomes orphaned

## Fix Plan

### 1. Pre-populate form from context (`OrganizationIdentityForm.tsx`)

Change the `useForm` `defaultValues` to read from `state.step1` if it exists:

```typescript
const form = useForm<OrganizationIdentityFormValues>({
  resolver: zodResolver(organizationIdentitySchema),
  defaultValues: {
    legal_entity_name: state.step1?.legal_entity_name ?? '',
    trade_brand_name: state.step1?.trade_brand_name ?? '',
    organization_type_id: state.step1?.organization_type_id ?? '',
    industry_ids: state.step1?.industry_ids ?? [],
    company_size_range: state.step1?.company_size_range ?? undefined,
    annual_revenue_range: state.step1?.annual_revenue_range ?? undefined,
    year_founded: state.step1?.year_founded ?? (undefined as unknown as number),
    hq_country_id: state.step1?.hq_country_id ?? '',
    state_province_id: state.step1?.state_province_id ?? '',
    city: state.step1?.city ?? '',
    operating_geography_ids: state.step1?.operating_geography_ids ?? [],
  },
});
```

This requires reading `state` from `useRegistrationContext()` (already imported but only destructured for setters). Add `state` to the destructure.

### 2. Add an `useUpdateOrganization` mutation (`useRegistrationData.ts`)

Create a new mutation that does an UPDATE + upsert of child records (industries, geographies) when `organizationId` already exists:

- UPDATE `seeker_organizations` with the changed fields
- DELETE + re-INSERT `seeker_org_industries` for the org
- DELETE + re-INSERT `seeker_org_operating_geographies` for the org

### 3. Conditional create vs update in `handleSubmit` (`OrganizationIdentityForm.tsx`)

```text
if (state.organizationId) {
  // UPDATE existing org
  await updateOrg.mutateAsync({ id: state.organizationId, ...data });
} else {
  // CREATE new org
  const result = await createOrg.mutateAsync(data);
  setOrgId(result.organizationId, result.tenantId);
}
```

Skip the duplicate check when updating an existing org (the user already confirmed it).

## Files Changed

| File | Change |
|------|--------|
| `src/components/registration/OrganizationIdentityForm.tsx` | Read `state` from context; pre-populate `defaultValues` from `state.step1`; branch create vs update in submit handler |
| `src/hooks/queries/useRegistrationData.ts` | Add `useUpdateOrganization` mutation (UPDATE org + replace child records) |

## Technical Notes

- The `state.step1` data is stored in the RegistrationContext's in-memory reducer. This persists across route changes within the same browser session since the `RegistrationProvider` wraps all registration routes.
- For the update mutation, child records (industries, geographies) are replaced using delete-then-insert to keep the logic simple and idempotent.
- The duplicate check is skipped when `state.organizationId` exists, since the org was already created by this user.
