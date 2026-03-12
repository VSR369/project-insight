

# Fix: Role Readiness Page — Align with Reference Design

## Problem

The current Role Readiness page (`/org/role-readiness`) uses `RoleReadinessPanel` which renders a compact Card widget with progress bar, colored pill rows, and count badges. The reference design (image-304) shows a completely different layout:

```text
Current Design (Wrong)              Reference Design (Correct)
─────────────────────────           ─────────────────────────
Card with Shield icon               Page title + subtitle
Progress bar (57%)                  Pink banner: "Roles Missing"
Colored pill rows                   Clean TABLE with columns:
  ✓ Account Manager 1/1              ROLE NAME | CODE | STATUS | USER ASSIGNED
  ✗ Legal Coord 0/1                 Avatar + name for active users
Count badges + chevrons             "—" dash for missing roles
Amber warning box                   Yellow bottom warning bar
```

### Gaps Found

1. **Layout**: Current uses Card widget; reference uses full-page table layout
2. **Back link**: Says "Back to Dashboard" — should say "Back to Role Management"  
3. **Title**: Says "Aggregator Role Readiness Status" — should say "Role Readiness Status"
4. **Subtitle**: Says "View the readiness status..." — should say "Full overview of all mandatory role assignments"
5. **Banner**: Current has no top banner; reference has pink/red "Roles Missing" banner with fill count
6. **Table format**: Current shows pill-style rows; reference shows a proper table with uppercase headers (ROLE NAME, CODE, STATUS, USER ASSIGNED)
7. **Status column**: Should show "Active" (green checkmark) or "Missing" (red X) — not count badges
8. **User Assigned column**: Should show avatar circle (initials) + full name, or "—" for missing
9. **Bottom warning**: Should be a yellow bar with triangle icon: "X of 7 roles are missing. Challenge submission is blocked."

## Plan

### Step 1: Update `RoleReadinessPage.tsx`
- Change back link text to "Back to Role Management" and target to `/org/role-management`
- Change title to "Role Readiness Status"
- Change subtitle to "Full overview of all mandatory role assignments"
- Replace `RoleReadinessPanel` with a new dedicated `RoleReadinessTable` component

### Step 2: Create `src/components/rbac/RoleReadinessTable.tsx`
A new component purpose-built for this page (not the dashboard widget):

- **Top banner**: Pink/red dashed-border card with XCircle icon, "Roles Missing" title, "{filled} of {total} roles filled. Challenge submission is blocked." (or green "All Roles Filled" when ready)
- **Table**: HTML table or div-grid with uppercase tracking-wider headers: ROLE NAME | CODE | STATUS | USER ASSIGNED
  - Each row shows role data from `useSlmRoleCodes` + `useRoleAssignments`
  - STATUS: Green checkmark + "Active" or Red X + "Missing"
  - USER ASSIGNED: Avatar circle with initials + name (from `role_assignments.user_name`), or "—" for unassigned
  - Rows with missing roles get light pink background
- **Bottom warning**: Yellow/amber bar: "⚠ X of Y roles are missing. Challenge submission is blocked." (only when not ready)

### Data Sources (existing hooks, no new queries)
- `useSlmRoleCodes()` — all role definitions
- `useRoleAssignments(orgId)` — who is assigned (has `user_name`, `user_email`, `status`)
- `useRoleReadiness(orgId, "agg")` — overall status + missing roles list

### Files
- **Modified**: `src/pages/org/RoleReadinessPage.tsx` — update text + swap component
- **Created**: `src/components/rbac/RoleReadinessTable.tsx` — new table-based layout matching reference

The existing `RoleReadinessPanel` remains unchanged — it's still used as the compact widget on the dashboard.

