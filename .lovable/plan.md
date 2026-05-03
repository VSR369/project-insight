## Surface Org Type ↔ Industry Segment mapping in Admin Master Data

### Root cause

The mapping table `public.org_type_industry_segments` exists in the DB and is already used by the **registration form** (`useIndustries(orgTypeId)`), but the **Admin → Master Data** pages were never updated to:

1. Display which Organization Types each Industry Segment belongs to (and vice versa).
2. Let an admin **assign / edit** the mapping when creating or editing an Industry Segment (or an Organization Type).

So when an admin adds a new Industry Segment from the admin UI, no row is inserted in `org_type_industry_segments` → the new segment never appears in the registration dropdown for any Organization Type. That matches the symptom the user described ("mapping is not shown and not displayed in the list").

`MasterDataForm` only supports `text | number | textarea | switch | select` — there is no multi-select field type, which is why the mapping field can't currently be added.

### Changes

**1. New shared hook `src/hooks/queries/useOrgTypeIndustryMap.ts`**
- `useOrgTypesForIndustry(industryId)` — returns mapped organization types (id, code, name) for a given segment.
- `useIndustriesForOrgType(orgTypeId)` — symmetrical lookup (already partially covered by `useIndustries`, kept for admin context).
- `useSetIndustryOrgTypes(industryId, orgTypeIds[])` — mutation that diffs current rows and inserts/deletes in `org_type_industry_segments` atomically; invalidates both directions and the registration cache key `industry_segments_for_reg`.
- `useSetOrgTypeIndustries(orgTypeId, industryIds[])` — symmetrical mutation.

**2. Extend `MasterDataForm` with a `multiselect` field type**
- Add `"multiselect"` to `FieldType`.
- Render using the existing shadcn `Popover + Command + Checkbox` pattern already used in `src/components/org/ScopeMultiSelect.tsx` (reuse, don't reinvent).
- Value shape: `string[]` of IDs. Schema side: `z.array(z.string().uuid())`.

**3. `IndustrySegmentsPage.tsx`**
- Add a new column **"Organization Types"** showing comma-joined org type names (truncated, full list in tooltip). Backed by a single query that fetches all mappings + org types and groups client-side.
- Add `organization_type_ids: string[]` to the form schema and `formFields` (multiselect, options sourced from `useOrganizationTypes(true)`).
- On submit: after create/update of the segment, call `useSetIndustryOrgTypes` with the selected IDs.
- View dialog: list mapped Organization Types as a new field.

**4. `OrganizationTypesPage.tsx`**
- Add an **"Industry Segments"** column (count + tooltip with names).
- Add `industry_segment_ids: string[]` to the form (multiselect from `useIndustrySegments(true)`).
- On submit: call `useSetOrgTypeIndustries`.
- View dialog: list mapped Industry Segments.

**5. RLS check**
- Confirm `org_type_industry_segments` has INSERT/DELETE policies for the admin role used by these pages. The earlier seed migration created policies for `platform_admin`; if the admin tooling uses a different role we'll add a matching policy in a small migration. (Verified separately before coding.)

**6. Cache invalidation**
- After any mapping mutation, invalidate: `['industry_segments_for_reg']` (registration), `['org_type_industries', *]`, `['industry_org_types', *]`. This ensures the registration dropdown immediately reflects admin edits — closing the loop on the reported bug.

### Out of scope
- No schema changes to `org_type_industry_segments` (already correct: `org_type_id`, `industry_id`, unique `(org_type_id, industry_id)`).
- No changes to existing College deactivation or seeded data.

### Files touched
- `src/components/admin/MasterDataForm.tsx` — add multiselect field type.
- `src/hooks/queries/useOrgTypeIndustryMap.ts` — **new**.
- `src/pages/admin/industry-segments/IndustrySegmentsPage.tsx` — column + form field + submit wiring.
- `src/pages/admin/organization-types/OrganizationTypesPage.tsx` — column + form field + submit wiring.
- (Conditional) one migration to grant admin RLS on the mapping table if missing.
