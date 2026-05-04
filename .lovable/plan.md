## Goal
When the user picks an Organization Type on the registration form, automatically pre-select all Industry Segments mapped to that org type (via the admin-managed `org_type_industry_segments` table), instead of leaving the field empty for the user to choose manually.

The user can still deselect any industry or add others — auto-populate is a starting default, not a lock.

## Change

**File:** `src/components/registration/OrganizationIdentityForm.tsx`

Replace the existing "reset industries when org type changes" effect (lines ~149-157) with logic that:

1. Fetches mapped industry IDs for the selected org type using the existing `useIndustriesForOrgType(orgTypeId)` hook from `src/hooks/queries/useOrgTypeIndustryMap.ts`.
2. On initial mount, preserves whatever industries the user already had in wizard state (no overwrite).
3. When the user actively changes the org type, sets `industry_ids` to the full mapped list returned by the hook (waits until the query resolves before writing).
4. If no industries are mapped to that org type, sets the field to `[]` (current behavior) so the existing "No industries are configured…" empty state in `IndustryTagSelector` shows.

### Technical detail
```ts
const { data: mappedIndustryIds } = useIndustriesForOrgType(watchedOrgTypeId);
const initialOrgTypeRef = useRef(state.step1?.organization_type_id ?? '');
const lastAppliedOrgTypeRef = useRef<string>('');

useEffect(() => {
  // Skip on initial mount — keep saved selections
  if (initialOrgTypeRef.current && watchedOrgTypeId === initialOrgTypeRef.current) {
    initialOrgTypeRef.current = '';
    lastAppliedOrgTypeRef.current = watchedOrgTypeId;
    return;
  }
  if (!watchedOrgTypeId) return;
  if (lastAppliedOrgTypeRef.current === watchedOrgTypeId) return;
  if (mappedIndustryIds === undefined) return; // wait for query
  form.setValue('industry_ids', mappedIndustryIds);
  lastAppliedOrgTypeRef.current = watchedOrgTypeId;
}, [watchedOrgTypeId, mappedIndustryIds, form]);
```

No DB, schema, or other component changes. The `IndustryTagSelector` already accepts the resulting array and renders selected badges with remove (X) buttons, so users retain full control.

## Out of scope
- No change to admin Master Data pages.
- No change to the mapping table or RLS.
- No change to `useIndustries(orgTypeId)` (the dropdown options remain filtered by mapping as today).
