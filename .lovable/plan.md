

# Fix: Direct/Invite Toggle Visibility + MsmeQuickAssignModal Support

## Problem Analysis

1. **AssignRoleSheet**: The Direct/Invite toggle IS in the code (lines 305-339) and renders unconditionally. It should be visible when the user clicks "Assign User" on any role row in Core Roles, Aggregator Roles, or Delegated Admins tabs. If the user doesn't see it, this may be a scroll issue or the toggle might be too subtle. We should verify it renders correctly and make it more prominent.

2. **MsmeQuickAssignModal**: Always hardcodes `status: "active"` (line 115) with NO Direct/Invite toggle. This needs the same toggle added.

## Plan

### 1. Verify and improve AssignRoleSheet toggle visibility
**File:** `src/components/rbac/roles/AssignRoleSheet.tsx`
- Move the "Assignment Mode" toggle higher in the sheet — place it immediately after the SheetDescription, before the tab toggle and role selector, so it's the first thing the admin sees
- Add a subtle border/background highlight to make it more visually distinct

### 2. Add Direct/Invite toggle to MsmeQuickAssignModal
**File:** `src/components/rbac/MsmeQuickAssignModal.tsx`
- Add `enrollMode` state (`"invite" | "direct"`, default `"direct"` since MSME is quick-assign)
- Add the same segmented toggle UI (Send/Zap icons) below the purple info banner
- Update `onSubmit` logic:
  - **Direct mode** (current behavior): bulk insert with `status: "active"`, then invoke `send-role-enrollment-confirmation` for each assignment
  - **Invite mode**: bulk insert with `status: "invited"` (change from hardcoded `"active"`), then invoke `send-role-invitation` for each assignment
- Import `supabase` client and `useOrgContext` for edge function calls
- Update summary text to reflect mode ("Ready to assign" vs "Ready to invite")

### Files to modify
| File | Change |
|------|--------|
| `src/components/rbac/roles/AssignRoleSheet.tsx` | Move toggle higher for visibility |
| `src/components/rbac/MsmeQuickAssignModal.tsx` | Add Direct/Invite toggle + conditional submit logic |

### No breaking changes
- RoleTable, AggRoleManagement, DelegatedAdminListTab — untouched
- Existing hooks reused — no new mutations needed
- Edge functions already exist — just invoked from new location

