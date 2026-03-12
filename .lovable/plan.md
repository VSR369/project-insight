

# Enhance "Existing Team Member" Tab — Show Full Member Details and All Assignable Roles

## Current State

The existing tab (lines 388-438) shows each member as a compact card with:
- Avatar initials, name, email
- Role code badges (e.g., `R2`, `R8`) — but no display names

The role selector dropdown (lines 442-474) only shows roles from `availableRoles` (which is passed in and may be filtered by caller context), not ALL roles from the system.

## Changes — Single File: `src/components/rbac/roles/AssignRoleSheet.tsx`

### 1. Enhance member card to show full details

For each member card, replace the compact role code badges with a more informative display:
- Show **name** prominently
- Show **email** below name
- Show **current roles** as labeled badges with display names (resolve from `availableRoles` list), e.g., "Account Manager (R2)" instead of just "R2"
- Include the **status** of each role assignment (active/invited) as a subtle indicator on the badge

To get display names, look up each role code in `availableRoles` array. For codes not found there, fall back to showing just the code.

### 2. Show ALL assignable roles (core + challenge/aggregator)

Currently `assignableRolesForMember` filters from `availableRoles` prop. The problem is `availableRoles` may be pre-filtered by the parent component.

**Fix**: Import `useSlmRoleCodes` hook directly in this component to get the full role catalog. Use this complete list (instead of the passed `availableRoles`) when computing `assignableRolesForMember`. This ensures core roles (R2, R8, R9) and aggregator roles (R4, R5_AGG, etc.) all appear in the dropdown.

- Add: `const { data: allRoleCodes } = useSlmRoleCodes();`
- Change `assignableRolesForMember` computation (line 135-137) to use `allRoleCodes` instead of `availableRoles`
- Group the dropdown options by category: **Core Roles** and **Challenge Roles** using `SelectGroup` + `SelectLabel` for clarity

### 3. Show role status alongside current role badges

For each member's current roles, cross-reference `existingAssignments` to get the status of each assignment (active vs invited). Display:
- Active roles: solid badge
- Invited (pending): outlined/dashed badge with "(Pending)" label

### 4. Info note remains

Keep the existing info note: "An invitation will be sent. The user must accept to activate this role."

## Result

- Member cards show full name, email, and all current roles with display names and statuses
- Role selector dropdown shows ALL system roles (core + challenge + aggregator) minus already-held ones
- Roles are grouped by category for easy selection
- Invitation lifecycle (accept/decline) continues to work as already implemented

