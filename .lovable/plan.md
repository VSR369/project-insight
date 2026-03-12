

# Plan: Merge Enroll Toggle into AssignRoleSheet (Remove Separate Page)

## What Changes

The **Direct / Invite toggle** from the standalone `EnrollRolePage` moves into the existing `AssignRoleSheet` side-sheet. The separate `/org/enroll` page, route, and sidebar item are removed.

## Files to Modify

### 1. `src/components/rbac/roles/AssignRoleSheet.tsx`
- Add a **Direct / Invite toggle** (small segmented control) above the form in the **"New User (Invite)" tab**
- When **Invite** is selected (default): current behavior — calls `useCreateRoleAssignment` (status: `invited`), then invokes `send-role-invitation` edge function. Button label: "Save & Invite"
- When **Direct** is selected: calls `useDirectEnrollRole` (status: `active` immediately), then invokes `send-role-enrollment-confirmation` edge function. Button label: "Enroll Now"
- Import `useDirectEnrollRole` from the hooks file
- Add mode state: `const [enrollMode, setEnrollMode] = useState<"invite" | "direct">("invite")`
- Update the info note text dynamically based on mode
- Update the footer button to switch between invite/direct submit logic
- Also add the toggle to the **"Existing Team Member" tab** flow — when assigning to an existing member, admin can choose direct vs invite

### 2. `src/components/org/OrgSidebar.tsx`
- Remove `{ title: 'Enroll', icon: UserPlus, path: '/org/enroll' }` from `roleManagementItems`

### 3. `src/App.tsx`
- Remove lazy import for `EnrollRolePage`
- Remove route `<Route path="enroll" ...>`

### 4. `src/pages/org/EnrollRolePage.tsx`
- **Delete this file** (no longer needed)

## No Other Impact

- `useDirectEnrollRole` hook stays in `useRoleAssignments.ts` — still used
- `useCreateRoleAssignment` hook stays — still used
- Edge functions `send-role-invitation` and `send-role-enrollment-confirmation` stay — now invoked from AssignRoleSheet
- `RoleManagementDashboard` unchanged — it already renders `AssignRoleSheet`
- `MsmeQuickAssignModal` unchanged
- Duplicate prevention (EC-11) still applies in both modes via the hooks

