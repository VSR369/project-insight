

# Enroll Option — Direct vs Invite Toggle

## Current State Analysis

The system currently has:
- **AssignRoleSheet** (`/org/role-management`): Creates assignments with status `"invited"` (DB default), generates `acceptance_token`, user must accept/decline via `/org/role-invitation?token=...`
- **MsmeQuickAssignModal**: Bulk-assigns with status `"active"` directly (skips invitation flow)
- **accept-role-invitation / decline-role-invitation** edge functions handle token-based acceptance
- **No dedicated "send-role-invitation" email edge function** exists — the invitation link is created but email delivery isn't wired yet
- **OrgSidebar** has Role Management and Role Readiness under "Role Management" group

## What This Feature Adds

A new **"Enroll"** sidebar item that opens a dedicated page with a **Direct / Invite toggle**:

| Mode | Flow | Status | Email |
|------|------|--------|-------|
| **Invite** | Admin enters name, email, role → saves with `status: "invited"` + `acceptance_token` → invitation email sent → user accepts/declines → status updated | `invited` → `active` or `declined` | Invitation email with accept/decline link |
| **Direct** | Admin enters name, email, role → saves with `status: "active"` + `activated_at: now()` | `active` immediately | Confirmation email notifying the user of their active role |

## Implementation Plan

### 1. Add "Enroll" sidebar item
**File:** `src/components/org/OrgSidebar.tsx`
- Add `{ title: 'Enroll', icon: UserPlus, path: '/org/enroll' }` to the `roleManagementItems` array (visible to SO Admins)

### 2. Create Enroll page
**File:** `src/pages/org/EnrollRolePage.tsx`

- **Direct / Invite toggle** at the top (styled like existing tab toggles)
- **Shared form fields:** Full Name, Email, Role selector (from `useSlmRoleCodes` filtered to `agg`/`both`), optional Domain Taxonomy
- **Invite mode:** Submit calls `useCreateRoleAssignment` with default DB status (`invited`) — existing duplicate check (EC-11) applies. Then calls a new `send-role-invitation` edge function to email the user
- **Direct mode:** Submit calls a new `useDirectEnrollRole` mutation that inserts with `status: "active"`, `activated_at: now()`. Then calls a new `send-role-enrollment-confirmation` edge function to email the user their active role details

### 3. Create edge function: `send-role-invitation`
**File:** `supabase/functions/send-role-invitation/index.ts`

- Accepts `{ assignment_id, org_name }` 
- Fetches the assignment record (email, role_code, acceptance_token, org_id)
- Looks up role display name from `md_slm_role_codes`
- Sends email via Resend with accept/decline link: `/org/role-invitation?token={acceptance_token}`
- Returns success/failure

### 4. Create edge function: `send-role-enrollment-confirmation`
**File:** `supabase/functions/send-role-enrollment-confirmation/index.ts`

- Accepts `{ assignment_id, org_name }`
- Fetches assignment details (email, role_code, status, activated_at)
- Sends confirmation email informing the user they've been directly enrolled with active status
- Includes role name, org name, and a link to `/org/dashboard`

### 5. Add mutation hook for direct enrollment
**File:** `src/hooks/queries/useRoleAssignments.ts`

- Add `useDirectEnrollRole` mutation that:
  - Runs duplicate check (EC-11)
  - Inserts with `status: "active"`, `activated_at: new Date().toISOString()`
  - Calls `send-role-enrollment-confirmation` edge function
  - Invalidates relevant query keys

### 6. Wire up routing
**File:** `src/App.tsx`
- Add lazy import for `EnrollRolePage`
- Add route: `<Route path="enroll" element={<EnrollRolePage />} />`

## Impact Analysis — No Breaking Changes

| Existing Feature | Impact |
|---|---|
| Role Management Dashboard | Unchanged — Enroll is a separate page |
| AssignRoleSheet | Unchanged — still works from role tables |
| MsmeQuickAssignModal | Unchanged — still works from MSME toggle |
| accept/decline-role-invitation | Unchanged — Invite mode uses same token flow |
| expire-stale-invitations | Unchanged — still expires `invited` status after 7 days |
| Role Readiness | Unchanged — only `active` status counts toward readiness |
| Duplicate prevention (EC-11) | Reused in both modes |
| Audit logging triggers | Automatically fire on insert — no changes needed |

### Files to create
| File | Purpose |
|------|---------|
| `src/pages/org/EnrollRolePage.tsx` | Enroll page with Direct/Invite toggle |
| `supabase/functions/send-role-invitation/index.ts` | Email invitation with accept/decline link |
| `supabase/functions/send-role-enrollment-confirmation/index.ts` | Confirmation email for direct enrollment |

### Files to modify
| File | Change |
|------|--------|
| `src/components/org/OrgSidebar.tsx` | Add "Enroll" menu item |
| `src/App.tsx` | Add `/org/enroll` route |
| `src/hooks/queries/useRoleAssignments.ts` | Add `useDirectEnrollRole` mutation |

