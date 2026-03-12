

# Fix: Inconsistent Button Labels — "Invite User" vs "Add User"

## Problem

The RoleTable uses two different labels for the same action:
- **"Invite User"** when the role is unassigned (line 108)
- **"Add User"** when the role already has assignments (line 120)

Both buttons call the same `onInvite(role.code)` function and open the same AssignRoleSheet. The label inconsistency is confusing.

## Fix

Standardize all buttons to say **"Assign User"** (consistent, neutral term that covers both invite-new and assign-existing flows). The short/mobile label becomes **"Assign"**.

### Single file: `src/components/rbac/roles/RoleTable.tsx`
- Line 108: `"Invite User"` → `"Assign User"`, line 109: `"Invite"` → `"Assign"`
- Line 120: `"Add User"` → `"Assign User"`, line 121: `"Add"` → `"Assign"`

This also aligns with the approved plan to always show the button (removing the `min_required` gate) and the AssignRoleSheet which already has tabs for "New User (Invite)" vs "Existing Team Member".

