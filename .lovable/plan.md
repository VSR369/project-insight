

# Redesign: AssignRoleSheet "Existing Team Member" Tab + Full Invitation Lifecycle

## Problem Summary

1. **Existing Team Member tab shows users who already have the target role** — they appear grayed out with "Already assigned" instead of being hidden. Confusing and noisy.
2. **No way to assign a different role to an existing member from this tab** — the tab is locked to the pre-selected role code. User wants a "user-centric" flow where they can pick any role for an existing member.
3. **No invitation accept/decline workflow exists for `role_assignments`** — the system only has `invited` → `inactive` (deactivate). There's no mechanism for invited users to accept or decline, and no `declined` status in `md_role_assignment_statuses`.
4. **The `expire-stale-invitations` edge function doesn't expire `role_assignments`** — it only handles `seeking_org_admins` and `admin_activation_links`.

## Plan

### Phase 1: Database Changes (Migration)

**1a. Add `declined` status to `md_role_assignment_statuses`**
```sql
INSERT INTO md_role_assignment_statuses (code, display_name, color_class, display_order)
VALUES ('declined', 'Declined', 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', 6)
ON CONFLICT (code) DO NOTHING;
```

**1b. Add `acceptance_token` column to `role_assignments`**
```sql
ALTER TABLE role_assignments
  ADD COLUMN IF NOT EXISTS acceptance_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS decline_reason TEXT;
```

**1c. Update `expire-stale-invitations` SQL support** — Add role_assignments expiry to the existing cron-triggered function.

### Phase 2: Edge Functions

**2a. `accept-role-invitation` edge function**
- Validates token from URL query param or authenticated user
- Sets `status = 'active'`, `activated_at = NOW()`
- Recomputes role readiness cache (trigger already handles this)

**2b. `decline-role-invitation` edge function**
- Validates token or authenticated user
- Sets `status = 'declined'`, `declined_at = NOW()`, optionally stores `decline_reason`
- Recomputes role readiness cache

**2c. Update `expire-stale-invitations`**
- Add a new block that expires `role_assignments` where `status = 'invited'` and `invited_at < 7 days ago`

### Phase 3: Frontend — AssignRoleSheet Redesign

**3a. Existing Team Member tab — User-centric flow**

Current behavior: Shows all existing members, grays out those who already have the target role, user can only assign the pre-selected role.

New behavior:
- Show all existing members with their current roles listed as badges
- Add a **role selector dropdown** per member (or a single dropdown after selecting a member) that shows all available roles **excluding roles the member already holds**
- Remove the `alreadyHasRole` disable logic — instead, the dropdown simply won't include roles they already have
- If a member holds all available roles, show a subtle "All roles assigned" label

Implementation in `AssignRoleSheet.tsx`:
- When `activeTab === "existing"`, add a `Select` dropdown for role selection (populated from `availableRoles` minus member's existing roles)
- The submit button says "Assign Role" and uses the selected role + selected member
- Keep the invite form (New User tab) unchanged — it still uses the pre-selected role code

**3b. Hide tab when no existing members**
- When `existingMembers.length === 0`, hide the tab toggle entirely and show only the invite form

### Phase 4: Frontend — Invitation Lifecycle Display

**4a. RoleTable and RoleReadinessTable already show per-user status badges**
- These already render `RoleAssignmentStatusBadge` with whatever status is in the DB
- The new `declined` status will automatically render with the correct color from `md_role_assignment_statuses`
- No changes needed to these components

**4b. Role Invitation Response Page**
- Create a new page at `/org/role-invitation` that accepts a token query param
- Shows role details, Accept/Decline buttons
- Calls the respective edge functions
- This page is accessible to authenticated users only

**4c. Add route in App.tsx**
- `/org/role-invitation?token=<uuid>` — public-ish route (auth required)

### Phase 5: Notification Integration

- When a role assignment is created with status `invited`, the system should ideally send an email with an acceptance link. For now, the acceptance link will be available as a copyable URL in the admin UI (toast after assignment creation shows the link).
- Future: Wire into the transactional email system.

## Files to Create/Modify

| File | Action |
|------|--------|
| Migration SQL | Create — add `declined` status, `acceptance_token` column |
| `supabase/functions/accept-role-invitation/index.ts` | Create |
| `supabase/functions/decline-role-invitation/index.ts` | Create |
| `supabase/functions/expire-stale-invitations/index.ts` | Modify — add role_assignments expiry |
| `src/components/rbac/roles/AssignRoleSheet.tsx` | Modify — user-centric existing member flow |
| `src/pages/org/RoleInvitationResponsePage.tsx` | Create — accept/decline UI |
| `src/App.tsx` | Modify — add route |
| `src/hooks/queries/useRoleAssignments.ts` | Modify — add accept/decline mutations |

## Technical Notes

- The DB unique index `idx_role_assignments_unique_active` already prevents duplicate active/invited assignments per (org, role, email) — this is correct
- The `fn_recompute_role_readiness` trigger fires on any role_assignments UPDATE, so accept/decline will automatically recompute readiness
- The `fn_audit_role_assignments` trigger will log all status transitions automatically
- `checkDuplicateInvitation` currently checks `seeking_org_admins` table, not `role_assignments` — this is a bug but orthogonal to this plan (the DB unique index enforces it anyway)

