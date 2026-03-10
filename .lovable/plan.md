

# Enforce Admin-Tier Gating on Role & Team Management

## Problem
Currently, `TeamPage.tsx` and `CustomRoleBuilder.tsx` do not check whether the current user is a PRIMARY or DELEGATED seeking org admin. When delegation is enabled, both admin types have unrestricted access to role creation and team member assignment.

## Decision
Based on the conversation, the recommended approach is **Option B — Both admins, scoped**:
- **PRIMARY admin**: Can create/edit roles (core assignment + custom roles) and manage all team members
- **DELEGATED admin**: Can only assign existing roles to team members within their `domain_scope`; cannot create new custom roles

## Changes

### 1. Create a hook: `useCurrentAdminTier`
**New file**: `src/hooks/useCurrentAdminTier.ts`

Query `seeking_org_admins` for the current user's `admin_tier` (PRIMARY/DELEGATED) and `domain_scope`. Returns `{ adminTier, domainScope, isPrimary, isLoading }`.

### 2. Gate `CustomRoleBuilder` to PRIMARY only
**File**: Parent component that renders `CustomRoleBuilder`

Pass an `isReadOnly` or `canCreate` prop based on `isPrimary` from the hook. DELEGATED admins see existing roles but cannot create new ones.

### 3. Gate team member actions by admin tier
**File**: `src/pages/org/TeamPage.tsx`

- PRIMARY admin: Full access (add member, change roles, remove)
- DELEGATED admin: Can only add/manage members (with role assignment restricted to their domain scope)
- Show a banner for DELEGATED admins explaining their scope limitations

### 4. Update `CustomRoleBuilder` label for clarity
**File**: `src/components/org-settings/CustomRoleBuilder.tsx`

Add a "PRIMARY admin only" badge next to the "New Role" button when the user is a DELEGATED admin, with a tooltip explaining why.

## Files

| File | Change |
|------|--------|
| `src/hooks/useCurrentAdminTier.ts` | New hook — query current user's admin tier |
| `src/pages/org/TeamPage.tsx` | Gate actions based on admin tier |
| `src/components/org-settings/CustomRoleBuilder.tsx` | Add read-only mode for DELEGATED admins |

