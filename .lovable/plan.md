

# Create Solution Maturity Master Data Table

## Summary
Create a new `md_solution_maturity` master data table with full CRUD admin page, following the exact pattern of `md_challenge_complexity`. Access restricted to Supervisor and Senior Admin tiers via existing PermissionGuard.

## Database Migration

**New table: `public.md_solution_maturity`**

```sql
CREATE TABLE public.md_solution_maturity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(30) NOT NULL UNIQUE,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

**Seed data:**
| Code | Label | Order |
|------|-------|-------|
| SOLUTION_BLUEPRINT | Solution Blueprint | 1 |
| SOLUTION_DEMO | Solution Demo | 2 |
| SOLUTION_POC | Solution Proof of Concept | 3 |
| SOLUTION_PROTOTYPE | Solution Prototype | 4 |

**RLS:** Enable RLS. Authenticated users can read active rows. No public write — writes happen via service role / admin edge functions (same pattern as other md_ tables).

**Index:** `idx_solution_maturity_active` on `(is_active, display_order)`.

---

## New Files

### 1. `src/hooks/queries/useSolutionMaturity.ts`
CRUD hooks following `useChallengeComplexity.ts` pattern exactly:
- `useSolutionMaturityList(includeInactive)`
- `useCreateSolutionMaturity()`
- `useUpdateSolutionMaturity()`
- `useDeleteSolutionMaturity()` (soft — sets `is_active = false`)
- `useRestoreSolutionMaturity()`
- `useHardDeleteSolutionMaturity()`

Query key: `["solution_maturity", { includeInactive }]`

### 2. `src/pages/admin/solution-maturity/SolutionMaturityPage.tsx`
Admin CRUD page following `ChallengeComplexityPage.tsx` pattern:
- Fields: code, label, description, display_order, is_active
- Zod schema for validation
- DataTable with View/Edit/Activate/Deactivate/Delete actions
- MasterDataForm dialog
- MasterDataViewDialog
- DeleteConfirmDialog

### 3. `src/pages/admin/solution-maturity/index.ts`
Barrel export.

---

## Modified Files

### 4. `src/App.tsx`
- Add lazy import for `SolutionMaturityPage`
- Add route: `seeker-config/solution-maturity` guarded by `PermissionGuard` with `permissionKey="seeker_config.view"` (same as challenge-complexity)

### 5. Sidebar navigation (if applicable)
- Add "Solution Maturity" menu item under Seeker Config section

---

## Technical Details
- No `tenant_id` — this is a platform-global master data table (same as all other `md_` tables)
- RLS restricts reads to authenticated users; writes controlled by admin permission guard at the UI/API layer
- Uses `withCreatedBy` / `withUpdatedBy` audit field utilities
- Uses `handleMutationError` for structured error handling
- Uses `CACHE_STABLE` or 5-min staleTime for reference data caching

