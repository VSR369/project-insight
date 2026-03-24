

# Plan: Integrate Role Fusion Enforcement into Assignment Flows

## Problem

The `validate_role_assignment()` SQL function and the 14 `role_conflict_rules` rows exist in the database, but **no frontend code calls them**. All three assignment paths insert directly without checking for conflicts:

1. **AssignRoleSheet** (org-level role assignment by Seeking Org Admin / Platform Admin) — inserts into `role_assignments` with no conflict check
2. **useAutoAssignChallengeRoles** (challenge-level auto-assignment) — inserts into `challenge_role_assignments` + `user_challenge_roles` with no conflict check
3. **useSolutionRequests** (manual challenge role assignment) — same pattern

The governance mode and role fusion rules are fully configured but completely unenforced at the UI layer.

## What Needs to Happen

### 1. Create a `useValidateRoleAssignment` hook

A reusable hook/utility that calls the existing `validate_role_assignment` RPC:

```typescript
const result = await supabase.rpc('validate_role_assignment', {
  p_challenge_id: challengeId,
  p_governance_profile: governanceMode, // resolved via resolveChallengeGovernance()
  p_new_role: roleCode,
  p_user_id: userId,
});
// Returns: { allowed: boolean, enforcement: 'HARD_BLOCK'|'SOFT_WARN'|null, conflicts: [...] }
```

The hook returns conflict details so the UI can:
- **HARD_BLOCK**: Disable the assign button, show error banner
- **SOFT_WARN**: Show amber warning with override confirmation dialog

### 2. Integrate into AssignRoleSheet (org-level roles)

This is where Seeking Org Admins and Platform Admins assign roles. When a user selects a role for an existing team member:
- Call `validate_role_assignment` with the user's existing challenge roles
- Show conflict warnings/blocks inline before the submit button
- For SOFT_WARN: show an "I understand the conflict" checkbox
- For HARD_BLOCK: disable submit with explanation

Note: Org-level assignments (`role_assignments` table) are separate from challenge-level assignments (`user_challenge_roles`). The conflict check applies when the same user holds conflicting challenge roles. At org-level, we should show a **preview warning** — "This user currently holds CR on 3 challenges; assigning CU would conflict under STRUCTURED/CONTROLLED governance."

### 3. Integrate into useAutoAssignChallengeRoles (auto-assignment)

Before inserting, call `validate_role_assignment`. If HARD_BLOCK is returned, skip that candidate and try the next best-scored one. SOFT_WARN candidates are allowed but the conflict is logged in `audit_trail`.

### 4. Integrate into challenge role manual assignment (useSolutionRequests)

Same pattern as auto-assign: validate before insert, surface warnings in UI.

### 5. Create a ConflictWarningBanner component

Reusable component that renders:
- Red banner with lock icon for HARD_BLOCK: "This role combination is blocked under CONTROLLED governance. CR and CU must be held by different users."
- Amber banner with warning icon for SOFT_WARN: "Warning: Assigning CR to this user who already holds CU is not recommended under STRUCTURED governance."

## Files to Create/Modify

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useValidateRoleAssignment.ts` | New hook calling `validate_role_assignment` RPC |
| `src/components/rbac/roles/ConflictWarningBanner.tsx` | New UI component for HARD_BLOCK / SOFT_WARN display |
| `src/components/rbac/roles/AssignRoleSheet.tsx` | Add conflict check on role selection, show banner, gate submit |
| `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` | Add pre-insert validation, skip HARD_BLOCK candidates |
| `src/hooks/queries/useSolutionRequests.ts` | Add validation to manual assignment mutation |

## What Does NOT Change

- The SQL `validate_role_assignment()` function — already correct
- The `role_conflict_rules` table — already seeded with 14 rows
- `resolve_challenge_governance()` — already deployed
- `governanceMode.ts` — already has client-side resolver

## Technical Details

- The `validate_role_assignment` RPC accepts `p_governance_profile` as a string. The frontend must resolve the effective governance mode first using `resolveChallengeGovernance()` before calling the RPC.
- For org-level assignments (no challenge context), the conflict check should use the org's default governance mode as a preview. The actual enforcement happens at challenge-level assignment time.
- SOFT_WARN overrides should be logged to `audit_trail` with action `ROLE_CONFLICT_OVERRIDE` and the admin's user ID.

