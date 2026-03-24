
# Final Matrix: Pricing Tier × Engagement Model × Governance × Role Fusion

## Status: COMPLETE (Reference Document)

All items below are implemented and live. This serves as the authoritative reference.

---

## 1. Configuration Scope

| Setting | Org-Level | Challenge-Level | Notes |
|---------|-----------|-----------------|-------|
| Pricing Tier | ✅ Fixed | ✗ No | Set via subscription |
| Engagement Model (MP/AGG) | ✅ Default | ✅ Override at Step 0 | Locked once ACTIVE (phase 7+) |
| Governance Mode (Q/S/C) | ✅ Default | ✅ Override at Step 0 | Clamped to tier ceiling |
| Role Fusion Rules | ✗ Not directly set | ✅ Derived from governance mode | Auto-resolved |

## 2. Tier → Governance Ceiling

| Tier | Allowed Modes | Default |
|------|---------------|---------|
| Basic | QUICK only | QUICK |
| Standard | QUICK, STRUCTURED | STRUCTURED |
| Premium | QUICK, STRUCTURED, CONTROLLED | STRUCTURED |
| Enterprise | QUICK, STRUCTURED, CONTROLLED | STRUCTURED |

Implemented in `TIER_GOVERNANCE_MODES` and `getDefaultGovernanceMode()` in `src/lib/governanceMode.ts`.

## 3. Engagement Model — Independent of Governance

| Feature | MP | AGG |
|---------|-----|-----|
| Intake role | AM | RQ |
| Spec role | CA (Architect) | CR (Creator) |

Engagement model does NOT affect role fusion. It only determines role names.

## 4. Governance Mode → Role Fusion

### QUICK — Zero conflict rules, solo operator
All 9 roles auto-assigned to creator. Any combination allowed.

### STRUCTURED — 5 SOFT_WARN rules
- CR+CU, CR+ID, CU+ID, CR+ER, ID+ER → warnings only

### CONTROLLED — 3 HARD_BLOCK + 6 SOFT_WARN
- CR+CU, CR+ID, CU+ID → HARD_BLOCK (system prevents)
- AM+CR, AM+CU, RQ+CR, RQ+CU, CR+ER, ID+ER → SOFT_WARN

## 5. Combined: Tier × Governance → Min Users

| Tier | Mode | Fusion | Min Users |
|------|------|--------|-----------|
| Basic | QUICK | All merged | 1 |
| Standard | QUICK | All merged | 1 |
| Standard | STRUCTURED | Warn on 5 | 1 (ideal 2-3) |
| Premium/Enterprise | QUICK | All merged | 1 |
| Premium/Enterprise | STRUCTURED | Warn on 5 | 1 (ideal 2-3) |
| Premium/Enterprise | CONTROLLED | Block 3 core, warn 6 | Min 3 (CR, CU, ID separate) |

## 6. Implementation Status

| Layer | Status |
|-------|--------|
| Tier → governance ceiling | ✅ Done |
| Governance mode selector (Step 0) | ✅ Done |
| Engagement model selector (Step 0) | ✅ Done |
| `validate_role_assignment()` | ✅ Done |
| `auto_assign_roles_on_creation()` | ✅ Done |
| Conflict rules in DB (14 rows) | ✅ Done |
| `resolveGovernanceMode()` | ✅ Done |
| Frontend `isQuick` rename (18 files) | ✅ Done |
| `isStructuredOrAbove` + deprecated alias | ✅ Done |

### Completed (was Future Enhancement)
- ✅ Per-challenge `governance_mode_override` column added to `challenges`
- ✅ `resolve_challenge_governance(p_challenge_id)` SQL function (3-layer: override → org default → tier ceiling)
- ✅ `validate_role_assignment()` and `auto_assign_roles_on_creation()` now call resolver
- ✅ Client-side `resolveChallengeGovernance()` in `governanceMode.ts`
- ✅ `ChallengeWizardPage.tsx` writes `governance_mode_override` on save

### Role Fusion Enforcement — Frontend Integration (Completed)
- ✅ `useValidateRoleAssignment` hook — calls `validate_role_assignment` RPC
- ✅ `ConflictWarningBanner` component — HARD_BLOCK (red) / SOFT_WARN (amber + override checkbox)
- ✅ `AssignRoleSheet` — conflict check integrated with reset on role/member change
- ✅ `useAutoAssignChallengeRoles` — pre-insert validation, skips HARD_BLOCK candidates, logs SOFT_WARN overrides
- ✅ `useAssignMember` (useSolutionRequests) — pre-insert validation, blocks on HARD_BLOCK, logs SOFT_WARN overrides to audit_trail
