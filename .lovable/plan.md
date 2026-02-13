

# Performance and Quality Fix Plan -- Master Data Portal

## Issues Found

### Issue 1: StatusBadge Missing forwardRef (Console Error on Every Screen)
The `StatusBadge` component triggers a React warning on every admin table page: "Function components cannot be given refs." The `DataTable` component passes refs via `flexRender`, but `StatusBadge` is a plain function component without `React.forwardRef`.

**Impact**: Console error spam on every master data screen that shows a Status column (all of them).

**Fix**: Wrap `StatusBadge` with `React.forwardRef` (same pattern already used for `Skeleton`).

**File**: `src/components/admin/StatusBadge.tsx`

---

### Issue 2: select("*") in 4 Master Data Hooks (Performance Violation)
Per the project's performance standards, `select("*")` fetches unnecessary columns and increases payload size. Four admin hooks still use it:

| Hook File | Table |
|-----------|-------|
| `useMembershipTiers.ts` | `md_membership_tiers` |
| `useIndustrySegments.ts` | `industry_segments` |
| `useParticipationModes.ts` | `participation_modes` |
| `useAcademicTaxonomy.ts` | `academic_disciplines` |

**Fix**: Replace `select("*")` with explicit column lists matching what each page actually renders.

---

### Issue 3: Redundant refetchQueries After invalidateQueries (8 Hooks)
`invalidateQueries()` already triggers a refetch for active queries. Calling `refetchQueries()` immediately after causes a **duplicate network request** on every restore operation, doubling the load time for that action.

**Affected hooks** (restore mutations only):
- `useIndustrySegments.ts`
- `useOrganizationTypes.ts`
- `useCountries.ts`
- `useParticipationModes.ts`
- `useAcademicTaxonomy.ts` (3 restore functions)
- `useExpertiseLevels.ts`
- `useProficiencyTaxonomyAdmin.ts` (3 restore functions)
- `useQuestionBank.ts`

**Fix**: Remove all `refetchQueries` calls -- `invalidateQueries` is sufficient.

---

### Issue 4: Missing Audit Fields in useMembershipTiers Mutations
The `useMembershipTiers` hook does not call `withCreatedBy()` or `withUpdatedBy()` on create/update mutations. This violates the audit trail standard and leaves `created_by`/`updated_by` as NULL.

**Fix**: Add `withCreatedBy` to the create mutation and `withUpdatedBy` to the update mutation.

---

## Technical Details

### Files Modified

| File | Changes |
|------|---------|
| `src/components/admin/StatusBadge.tsx` | Add `React.forwardRef` wrapper |
| `src/hooks/queries/useMembershipTiers.ts` | Replace `select("*")` with explicit columns; add audit field helpers |
| `src/hooks/queries/useIndustrySegments.ts` | Replace `select("*")`; remove redundant `refetchQueries` |
| `src/hooks/queries/useParticipationModes.ts` | Replace `select("*")`; remove redundant `refetchQueries` |
| `src/hooks/queries/useAcademicTaxonomy.ts` | Replace `select("*")` for disciplines; remove 3 redundant `refetchQueries` |
| `src/hooks/queries/useOrganizationTypes.ts` | Remove redundant `refetchQueries` |
| `src/hooks/queries/useCountries.ts` | Remove redundant `refetchQueries` |
| `src/hooks/queries/useExpertiseLevels.ts` | Remove redundant `refetchQueries` |
| `src/hooks/queries/useProficiencyTaxonomyAdmin.ts` | Remove 3 redundant `refetchQueries` |
| `src/hooks/queries/useQuestionBank.ts` | Remove redundant `refetchQueries` |

### Risk Assessment

| Change | Risk |
|--------|------|
| StatusBadge forwardRef | Zero -- additive wrapper, no behavior change |
| select("*") to explicit columns | Zero -- same data, smaller payload |
| Remove refetchQueries | Zero -- invalidateQueries already refetches active queries |
| Add audit helpers | Zero -- adds missing data, no schema change |

### Execution Order
1. Fix StatusBadge (eliminates console errors across all screens)
2. Fix all 4 `select("*")` hooks (reduces payload size)
3. Remove all redundant `refetchQueries` (eliminates duplicate network calls)
4. Add audit fields to useMembershipTiers (data correctness)

