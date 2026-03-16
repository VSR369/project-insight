

# Add Solver Eligibility to Admin UI & Challenge Creation Form

## What's Missing

1. **Admin Sidebar** — No "Solver Eligibility" menu item under Seeker Config
2. **Admin CRUD Page** — No page to view/edit/manage the 8 solver eligibility categories
3. **Challenge Create Form** — No selector UI for choosing solver eligibility when creating a challenge

## Plan

### 1. Create Admin CRUD Page for Solver Eligibility
- New file: `src/pages/admin/solver-eligibility/SolverEligibilityPage.tsx`
- Follow the existing Master Data Page Factory pattern (same as `ChallengeComplexityPage.tsx`)
- DataTable columns: Code, Label, Description, Requires Auth, Requires Certification, Min Star Rating, Display Order, Status
- Full CRUD: Add, Edit, View, Soft Delete using `MasterDataForm`, `MasterDataViewDialog`, `DeleteConfirmDialog`
- Create hooks in `src/hooks/queries/useSolverEligibilityAdmin.ts` for list/create/update/delete mutations

### 2. Add Sidebar Menu Item
- Add `{ title: 'Solver Eligibility', icon: Users, path: '/admin/seeker-config/solver-eligibility' }` to `seekerConfigItems` array in `AdminSidebar.tsx`

### 3. Add Route
- Register the new page route in the admin router (alongside other seeker-config routes)

### 4. Add Solver Eligibility Selector to Challenge Creation Form
- New section in `ChallengeCreatePage.tsx` after the Visibility selector
- Radio card layout showing all 8 categories with icons and descriptions from `SOLVER_ELIGIBILITY_DISPLAY` constants
- Wired to `solver_eligibility_id` form field

### Technical Details
- Admin hooks follow the same pattern as `useChallengeComplexityList` — CRUD operations against `md_solver_eligibility` table
- RLS: table already has public read for authenticated users from the migration
- The `useSolverEligibility()` read hook already exists in `useChallengeData.ts`

