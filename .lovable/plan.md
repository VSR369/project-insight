

# Complete Governance Matrix — Live Implementation Reference

## 1. Capability Matrix by Pricing Tier

```text
┌────────────────────────────┬─────────┬──────────┬─────────┬────────────┐
│ Capability                 │ Basic   │ Standard │ Premium │ Enterprise │
├────────────────────────────┼─────────┼──────────┼─────────┼────────────┤
│ Governance modes available │ QUICK   │ QUICK    │ QUICK   │ QUICK      │
│                            │         │ STRUCT.  │ STRUCT. │ STRUCT.    │
│                            │         │          │ CTRL.   │ CTRL.      │
├────────────────────────────┼─────────┼──────────┼─────────┼────────────┤
│ Org default governance     │ QUICK   │ STRUCT.  │ STRUCT. │ STRUCT.    │
│ (auto-assigned)            │ (fixed) │          │         │            │
├────────────────────────────┼─────────┼──────────┼─────────┼────────────┤
│ Org can SET default gov.   │ No      │ Yes (Q/S)│ Yes     │ Yes        │
│                            │ (only Q)│          │ (Q/S/C) │ (Q/S/C)    │
├────────────────────────────┼─────────┼──────────┼─────────┼────────────┤
│ Per-challenge gov override │ No      │ Yes      │ Yes     │ Yes        │
│                            │ (only Q)│ (Q or S) │ (Q/S/C) │ (Q/S/C)   │
├────────────────────────────┼─────────┼──────────┼─────────┼────────────┤
│ Custom fusion policies     │ No      │ No       │ No      │ No         │
│ (all derived from mode)    │         │          │         │            │
├────────────────────────────┼─────────┼──────────┼─────────┼────────────┤
│ Engagement models allowed  │ MP, AGG │ MP, AGG  │ MP, AGG │ MP, AGG    │
│ (per-challenge selectable) │         │          │         │            │
└────────────────────────────┴─────────┴──────────┴─────────┴────────────┘
```

**Key point**: Custom fusion policies do not exist. Fusion rules are always derived from the governance mode. No tier gets special fusion behavior — the tier only controls which governance modes are available.

---

## 2. Org-Level vs Challenge-Level Control Table

```text
┌──────────────────────────┬───────────┬─────────────┬────────────────────┐
│ Setting                  │ Org-Level │ Challenge   │ Tier Unlock        │
│                          │           │ Override    │                    │
├──────────────────────────┼───────────┼─────────────┼────────────────────┤
│ Pricing Tier             │ SET       │ —           │ All (subscription) │
│ Engagement Model (MP/AGG)│ DEFAULT   │ OVERRIDE    │ All tiers          │
│                          │           │ at Step 0   │ (locked at ACTIVE) │
│ Governance Mode (Q/S/C)  │ DEFAULT   │ OVERRIDE    │ Clamped to tier    │
│                          │           │ at Step 0   │ ceiling            │
│ Role Fusion Rules        │ —         │ DERIVED     │ Follows governance │
│                          │           │ from mode   │ mode               │
│ Field Visibility Rules   │ —         │ DERIVED     │ Follows governance │
│ (md_governance_field_    │           │ from mode   │ mode               │
│  rules)                  │           │             │                    │
│ Legal Entity Name        │ LOCKED    │ —           │ All (immutable)    │
│ Org Type / HQ Country    │ LOCKED    │ —           │ All (immutable)    │
│ Org Name / Brand / URL   │ EDITABLE  │ —           │ All                │
└──────────────────────────┴───────────┴─────────────┴────────────────────┘
```

**Resolution order for governance mode**: Challenge `governance_mode_override` → Org `governance_profile` → Tier ceiling clamp.

---

## 3. Role Fusion Matrix (All 9 Pairs × 3 Modes)

```text
┌──────────┬───────────┬────────────┬────────────┐
│ Pair     │ QUICK     │ STRUCTURED │ CONTROLLED │
├──────────┼───────────┼────────────┼────────────┤
│ CR + CU  │ ALLOWED   │ SOFT_WARN  │ HARD_BLOCK │
│ CR + ID  │ ALLOWED   │ SOFT_WARN  │ HARD_BLOCK │
│ CU + ID  │ ALLOWED   │ SOFT_WARN  │ HARD_BLOCK │
│ CR + ER  │ ALLOWED   │ SOFT_WARN  │ SOFT_WARN  │
│ ID + ER  │ ALLOWED   │ SOFT_WARN  │ SOFT_WARN  │
│ AM + CR  │ ALLOWED   │ ALLOWED    │ SOFT_WARN  │
│ AM + CU  │ ALLOWED   │ ALLOWED    │ SOFT_WARN  │
│ RQ + CR  │ ALLOWED   │ ALLOWED    │ SOFT_WARN  │
│ RQ + CU  │ ALLOWED   │ ALLOWED    │ SOFT_WARN  │
├──────────┼───────────┼────────────┼────────────┤
│ Total    │ 0 rules   │ 5 rules    │ 9 rules    │
│ rules    │           │ (all WARN) │ (3 BLOCK   │
│          │           │            │  + 6 WARN) │
└──────────┴───────────┴────────────┴────────────┘
```

**What each level means in practice**:
- **ALLOWED**: No check, no UI feedback. Assignment proceeds silently.
- **SOFT_WARN**: Amber banner appears in AssignRoleSheet. Admin must check "I understand the reduced governance and wish to proceed" before the Assign button enables. Override is logged to `audit_trail` with action `ROLE_CONFLICT_OVERRIDE`.
- **HARD_BLOCK**: Red banner with lock icon. Assign button is disabled. No override possible. In auto-assignment, the candidate is silently skipped and the next-best candidate is tried.

---

## 4. End-to-End Scenario Walkthroughs

### Scenario A: Basic tier startup, QUICK mode, 1 person

1. Org has `subscription_tier = 'basic'`, `governance_profile = 'QUICK'`.
2. User creates a challenge. `StepModeSelection` shows only QUICK (greyed-out STRUCTURED/CONTROLLED with tier upgrade prompt).
3. Challenge saved with `governance_mode_override = 'QUICK'`.
4. `auto_assign_roles_on_creation()` fires → detects QUICK mode → assigns all 9 roles (AM, CR, CU, ID, ER, LC, FC, CA, RQ) to the challenge creator.
5. `validate_role_assignment()` is never called because QUICK has zero `role_conflict_rules` rows — no conflicts possible.
6. User sees all role tabs in their challenge dashboard. One person runs everything.

### Scenario B: Standard tier, STRUCTURED, same person tries CR + CU

1. Org has `subscription_tier = 'standard'`, `governance_profile = 'STRUCTURED'`.
2. User creates challenge, selects STRUCTURED at Step 0. Override stored.
3. User A is already assigned CR on this challenge.
4. Platform Admin opens AssignRoleSheet, selects User A, picks CU role.
5. `useValidateRoleAssignment` hook calls `validate_role_assignment` RPC with `p_user_id = User A`, `p_new_role = 'CU'`, `p_challenge_id = X`.
6. RPC finds CR+CU conflict in `role_conflict_rules` where `governance_profile IN ('STRUCTURED', 'BOTH')` with `enforcement = 'SOFT_WARN'`.
7. RPC returns `{ allowed: false, conflict_type: 'SOFT_WARN', message: '...' }`.
8. UI renders amber `ConflictWarningBanner`: "Role Conflict — Warning" with the conflict message.
9. Assign button is disabled until admin checks "I understand the reduced governance and wish to proceed".
10. On submit, override is logged to `audit_trail`. Assignment proceeds.

### Scenario C: Premium tier, CONTROLLED, CR + ID hard-blocked

1. Org has `subscription_tier = 'premium'`, `governance_profile = 'CONTROLLED'`.
2. Challenge created with CONTROLLED override.
3. User B already holds CR. Admin tries to assign ID to User B.
4. `validate_role_assignment` RPC finds CR+ID in `role_conflict_rules` with `enforcement = 'HARD_BLOCK'` for CONTROLLED.
5. RPC returns `{ allowed: false, conflict_type: 'HARD_BLOCK', message: '...' }`.
6. UI renders red `ConflictWarningBanner` with lock icon: "Role Conflict — Blocked".
7. Assign button remains disabled. No override checkbox shown.
8. Admin must select a different user for the ID role.
9. If this happens during auto-assignment (`useAutoAssignChallengeRoles`), User B is silently skipped. The system tries the next highest-scored candidate from `platform_provider_pool`. If that candidate also conflicts, it continues down the list. If no valid candidate exists, the function returns `null`.

---

## 5. Implementation Confirmation — Where Each Behaviour Is Enforced

| Behaviour | Enforcement Point |
|-----------|-------------------|
| **Tier → allowed governance modes** | `TIER_GOVERNANCE_MODES` constant in `src/lib/governanceMode.ts` (lines 83-88) |
| **Tier ceiling clamping** | `getAvailableGovernanceModes()` + `resolveChallengeGovernance()` in `src/lib/governanceMode.ts` (lines 93-135) |
| **Org default governance** | `seeker_organizations.governance_profile` column, CHECK constraint `IN ('QUICK','STRUCTURED','CONTROLLED')` |
| **Per-challenge override** | `challenges.governance_mode_override` column, CHECK constraint `IN ('QUICK','STRUCTURED','CONTROLLED')` |
| **3-layer resolution (SQL)** | `resolve_challenge_governance(p_challenge_id)` SQL function (SECURITY DEFINER) |
| **3-layer resolution (client)** | `resolveChallengeGovernance()` in `src/lib/governanceMode.ts` (lines 124-135) |
| **Role conflict rules (data)** | `role_conflict_rules` table — 14 rows, CHECK constraint `governance_profile IN ('STRUCTURED','CONTROLLED','BOTH')` |
| **Role validation (SQL)** | `validate_role_assignment()` SQL function — queries `role_conflict_rules` using resolved mode |
| **Role validation (frontend hook)** | `useValidateRoleAssignment` in `src/hooks/cogniblend/useValidateRoleAssignment.ts` |
| **HARD_BLOCK UI** | `ConflictWarningBanner` (red, lock icon) in `src/components/rbac/roles/ConflictWarningBanner.tsx` |
| **SOFT_WARN UI + checkbox** | `ConflictWarningBanner` (amber, checkbox) in same file |
| **AssignRoleSheet integration** | `src/components/rbac/roles/AssignRoleSheet.tsx` — calls `checkConflict()`, renders banner, gates submit |
| **Auto-assign skip HARD_BLOCK** | `autoAssignChallengeRole()` in `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` (lines 140-173) |
| **Auto-assign log SOFT_WARN** | Same file, lines 154-168 — inserts `ROLE_CONFLICT_OVERRIDE` into `audit_trail` |
| **Manual challenge assignment** | `useAssignMember` in `src/hooks/queries/useSolutionRequests.ts` — pre-insert validation |
| **QUICK auto-assign all roles** | `auto_assign_roles_on_creation()` SQL function — checks governance mode, assigns all to creator |
| **Engagement model per-challenge** | `challenges.operating_model` column, locked by `trg_challenges_lock_operating_model` trigger at ACTIVE phase |
| **Engagement model default** | `seeker_organizations.operating_model` column |
| **Org field editability** | `orgSettingsService.ts` — `LOCKED_FIELDS` / `EDITABLE_FIELDS` sets |
| **Governance badge rendering** | `GOVERNANCE_MODE_CONFIG` in `src/lib/governanceMode.ts` (lines 60-79) |
| **Permission guarding** | `PermissionGuard` in `src/components/admin/PermissionGuard.tsx` — tier_permissions table |
| **Legacy backward compat** | `resolveGovernanceMode()` — maps `LIGHTWEIGHT→QUICK`, `ENTERPRISE→STRUCTURED` |
| **Deprecated alias** | `isEnterpriseGrade = isStructuredOrAbove` in `governanceMode.ts` (line 44) |

