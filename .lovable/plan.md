

## Plan: Remove Solver Eligibility from Platform Admin Portal

Solver Eligibility will be deferred to the Challenge Lifecycle Management module, where the Innovation Director will set it. For now, we cleanly remove it from the Admin portal without dropping the database table (since `challenges` has a FK reference to `md_solver_eligibility`).

### Changes

**1. Remove sidebar menu item** — `src/components/admin/AdminSidebar.tsx`
- Remove the `Solver Eligibility` entry from the Seeker Config menu group

**2. Remove route** — `src/App.tsx`
- Remove the lazy import for `SolverEligibilityPage`
- Remove the `/admin/seeker-config/solver-eligibility` route

**3. Remove page files**
- Delete `src/pages/admin/solver-eligibility/SolverEligibilityPage.tsx`
- Delete `src/pages/admin/solver-eligibility/index.ts`

**4. Remove admin CRUD hook** — `src/hooks/queries/useSolverEligibilityAdmin.ts`
- Delete this file (admin create/update/delete/restore operations)

**5. Remove constants file** — `src/constants/solverEligibility.constants.ts`
- Delete this file
- Remove the re-export from `src/constants/index.ts`

**6. Clean up challenge validation** — `src/lib/validations/challenge.ts`
- Remove `solver_eligibility_id` from the required validation schema (make it optional or remove entirely)

**7. Keep intact (no changes needed)**
- `md_solver_eligibility` DB table — kept for future use by Challenge Lifecycle module
- `useSolverEligibility()` in `useChallengeData.ts` — kept for future challenge creation use
- `solver_eligibility_id` column on `challenges` table — kept, already nullable
- `tier_permissions` rows for `seeker_config.view` — no change needed (other seeker config pages still use it)

### What stays safe
- The DB table and FK remain untouched, so no data loss or migration needed
- The `useSolverEligibility` query hook in `useChallengeData.ts` stays for when the Innovation Director needs it during challenge creation
- All other Seeker Config pages continue working normally

