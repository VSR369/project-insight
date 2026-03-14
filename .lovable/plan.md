

# Fix: Role Readiness — Show Missing Role Names & Add Navigation

## Problem
The bottom warning bar says "1 of 7 roles are missing. Challenge submission is blocked." but:
1. It doesn't name **which** role(s) are missing
2. There's no button/link to navigate to Role Management to assign the missing role

## Changes — Single File: `src/components/rbac/RoleReadinessTable.tsx`

### 1. Bottom Warning Bar — Show missing role names
Use the already-available `roleRows` data to list the missing role display names in the warning text. Change from:
> "1 of 7 roles are missing."

To:
> "1 of 7 roles are missing: **Account Manager (R2)**. Challenge submission is blocked."

### 2. Add "Assign Roles" navigation button
Add a `Link` (or `Button` with `useNavigate`) to `/org/role-management` in the bottom warning bar so the admin can go directly to assign the missing role.

### 3. Add "Assign" action in the table rows
For rows where the role is missing (no assignments), add a small "Assign" link/button in the User Assigned column pointing to `/org/role-management`, replacing the current `—` dash.

### Implementation Detail
- Import `Link` from `react-router-dom` and `ArrowRight` from `lucide-react`
- Compute `missingRoleNames` from `roleRows.filter(r => r.isMissingPerCache).map(r => r.displayName)`
- Bottom bar: `"{missingCount} of {total} roles are missing: {missingRoleNames.join(', ')}. Challenge submission is blocked."` + an "Assign Roles →" link
- Table missing rows: Replace `—` with a small outline button linking to role management

