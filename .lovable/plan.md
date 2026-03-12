

# Fix: RoleReadinessTable Not Showing Assignment Data

## Problem — Two Bugs

**Bug 1: Only looking for "active" assignments**
Line 47-48 filters assignments with `a.status === "active"`. The R2 Account Manager has 2 assignments with status `"invited"`, so they are ignored. The user name column shows "—" instead of the assigned person.

**Bug 2: Using readiness cache to determine status instead of actual assignments**
Line 50 uses `missingCodes.includes(role.code)` from `role_readiness_cache` to decide if a role shows "Active" or "Missing". The cache says R2 is missing (because "invited" != "active" in the cache logic). But the table should show the **actual assignment status** (invited, active, etc.) — not just binary Active/Missing.

## Evidence from Live Data
- `role_assignments` returns 2 R2 records with `status: "invited"`, `user_name: "Test Account Manager"` and `"Rebecca Thornton"`
- `role_readiness_cache.missing_roles` includes `"R2"` — so the table shows R2 as "Missing" with no user, even though users ARE assigned

## Fix in `src/components/rbac/RoleReadinessTable.tsx`

### Change the role row building logic:
1. Find **all** assignments for each role code (not just "active" ones)
2. Determine status from actual assignment data:
   - If assignments exist → show the assignment status (invited/active) using `RoleAssignmentStatusBadge`
   - If no assignments → show "Missing"
3. Show **all** assigned users with their names and avatars (a role like R7 can have multiple)
4. Use the `RoleAssignmentStatusBadge` component (already exists, DB-driven colors) instead of hardcoded "Active"/"Missing" text
5. Keep using `missingCodes` only for row background highlighting (pink for unfilled roles per readiness cache)

### Result
- R2 row will show "Test Account Manager" + "Rebecca Thornton" with "Invited" badges
- Truly missing roles (R4, R5_AGG, etc.) will still show "Missing" with "—"
- Status column uses the same DB-driven badges as the Role Management table

### Single file change
- `src/components/rbac/RoleReadinessTable.tsx` — update role row logic + import `RoleAssignmentStatusBadge`

