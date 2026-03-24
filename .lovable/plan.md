

# Plan: Per-Challenge Governance Override + Resolver Function

## What This Fixes

Currently, the challenge wizard writes the governance mode directly to `challenges.governance_profile`. There is no formal 3-layer resolution (challenge override → org default → tier ceiling) enforced at the database level. The two "Not yet" items from the matrix need to be implemented.

## Changes

### 1. SQL Migration (single file)

**A. Add `governance_mode_override` column to `challenges`**
- Nullable TEXT column, CHECK constraint: `IN ('QUICK', 'STRUCTURED', 'CONTROLLED')`
- When NULL, challenge inherits org default

**B. Create `resolve_challenge_governance(p_challenge_id UUID)` function**
- SECURITY DEFINER function that implements 3-layer resolution:
  1. Read `challenges.governance_mode_override` — if not null, use it
  2. Else read `seeker_organizations.governance_profile` via `challenges.organization_id`
  3. Clamp result against tier ceiling (lookup org's tier → allowed modes)
  4. Return the effective governance mode as TEXT
- This becomes the single source of truth for "what governance applies to this challenge"

**C. Update `validate_role_assignment()` to call `resolve_challenge_governance()`**
- Instead of reading `challenges.governance_profile` directly, call the resolver
- This ensures role fusion rules respect per-challenge overrides

**D. Update `auto_assign_roles_on_creation()` similarly**
- Use resolver to determine if QUICK mode (all roles auto-assigned)

### 2. Frontend — Wire override to wizard

**`StepModeSelection.tsx`**: The governance mode selector already writes to the form. Update the challenge save logic in `ChallengeWizardPage.tsx` to write the selected mode to `governance_mode_override` instead of (or in addition to) `governance_profile`.

**`governanceMode.ts`**: Add a `resolveChallengeGovernance()` client-side helper that mirrors the SQL logic for optimistic UI (read override first, fall back to org profile, clamp to tier).

### 3. Update plan.md

Mark both items as Done.

## What Does NOT Change

- `StepModeSelection.tsx` UI — already renders Q/S/C cards with tier clamping
- `useCogniPermissions`, `CogniRoleContext`, `RoleSwitcher` — unchanged
- `can_perform()` phase checks — orthogonal to governance resolution
- Existing `governance_profile` column on challenges — kept for backward compat; the override column takes precedence when set

## File Count

| Type | Count |
|------|-------|
| SQL migration | 1 file |
| Frontend update | 2 files (ChallengeWizardPage.tsx, governanceMode.ts) |
| Plan update | 1 file |

