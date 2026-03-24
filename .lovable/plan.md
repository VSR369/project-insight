
# Final Matrix: Pricing Tier × Engagement Model × Governance × Role Fusion

## Status: COMPLETE (Reference Document)

All items below are implemented and live. This serves as the authoritative reference.

---

## 1. Capability Matrix by Pricing Tier

| Capability | Basic | Standard | Premium | Enterprise |
|---|---|---|---|---|
| Governance modes available | QUICK | QUICK, STRUCTURED | QUICK, STRUCTURED, CONTROLLED | QUICK, STRUCTURED, CONTROLLED |
| Org default governance | QUICK (fixed) | STRUCTURED | STRUCTURED | STRUCTURED |
| Org can SET default gov. | No (only Q) | Yes (Q/S) | Yes (Q/S/C) | Yes (Q/S/C) |
| Per-challenge gov override | No (only Q) | Yes (Q or S) | Yes (Q/S/C) | Yes (Q/S/C) |
| Custom fusion policies | No | No | No | No |
| Engagement models allowed | MP, AGG | MP, AGG | MP, AGG | MP, AGG |

Implemented in `TIER_GOVERNANCE_MODES` and `getDefaultGovernanceMode()` in `src/lib/governanceMode.ts`.

---

## 2. Org-Level vs Challenge-Level Control

| Setting | Org-Level | Challenge Override | Tier Unlock |
|---|---|---|---|
| Pricing Tier | SET (fixed) | — | All (subscription) |
| Engagement Model (MP/AGG) | DEFAULT | OVERRIDE at Step 0 | All tiers (locked at ACTIVE) |
| Governance Mode (Q/S/C) | DEFAULT | OVERRIDE at Step 0 | Clamped to tier ceiling |
| Role Fusion Rules | — | DERIVED from mode | Follows governance mode |
| Field Visibility Rules | — | DERIVED from mode | Follows governance mode |
| Legal Entity Name | LOCKED | — | All (immutable) |
| Org Type / HQ Country | LOCKED | — | All (immutable) |
| Org Name / Brand / URL | EDITABLE | — | All |

**Resolution order**: Challenge `governance_mode_override` → Org `governance_profile` → Tier ceiling clamp.

---

## 3. Role Fusion Matrix (9 Pairs × 3 Modes)

| Pair | QUICK | STRUCTURED | CONTROLLED |
|---|---|---|---|
| CR + CU | ALLOWED | SOFT_WARN | HARD_BLOCK |
| CR + ID | ALLOWED | SOFT_WARN | HARD_BLOCK |
| CU + ID | ALLOWED | SOFT_WARN | HARD_BLOCK |
| CR + ER | ALLOWED | SOFT_WARN | SOFT_WARN |
| ID + ER | ALLOWED | SOFT_WARN | SOFT_WARN |
| AM + CR | ALLOWED | ALLOWED | SOFT_WARN |
| AM + CU | ALLOWED | ALLOWED | SOFT_WARN |
| RQ + CR | ALLOWED | ALLOWED | SOFT_WARN |
| RQ + CU | ALLOWED | ALLOWED | SOFT_WARN |
| **Totals** | **0 rules** | **5 SOFT_WARN** | **3 HARD_BLOCK + 6 SOFT_WARN** |

- **ALLOWED**: No check, assignment proceeds silently.
- **SOFT_WARN**: Amber banner + override checkbox required. Logged to `audit_trail` as `ROLE_CONFLICT_OVERRIDE`.
- **HARD_BLOCK**: Red banner, assign button disabled. In auto-assignment, candidate skipped silently.

---

## 4. Tier × Governance → Min Users

| Tier | Mode | Fusion | Min Users |
|---|---|---|---|
| Basic | QUICK | All merged | 1 |
| Standard | QUICK | All merged | 1 |
| Standard | STRUCTURED | Warn on 5 | 1 (ideal 2-3) |
| Premium/Enterprise | QUICK | All merged | 1 |
| Premium/Enterprise | STRUCTURED | Warn on 5 | 1 (ideal 2-3) |
| Premium/Enterprise | CONTROLLED | Block 3 core, warn 6 | Min 3 (CR, CU, ID separate) |

---

## 5. End-to-End Scenarios

### A: Basic → QUICK → 1 person
1. `StepModeSelection` shows only QUICK (others greyed with tier upgrade prompt)
2. `auto_assign_roles_on_creation()` assigns all 9 roles to creator
3. Zero conflict checks — QUICK has 0 rules

### B: Standard → STRUCTURED → CR+CU same person
1. Admin assigns CU to user already holding CR
2. `validate_role_assignment` RPC returns `SOFT_WARN`
3. Amber `ConflictWarningBanner` appears with override checkbox
4. Override logged to `audit_trail`

### C: Premium → CONTROLLED → CR+ID blocked
1. Admin assigns ID to user holding CR
2. `validate_role_assignment` RPC returns `HARD_BLOCK`
3. Red `ConflictWarningBanner` with lock icon, assign button disabled
4. In auto-assignment, candidate skipped, next-best tried

---

## 6. Implementation Status — All Complete

| Layer | Status | Enforcement Point |
|---|---|---|
| Tier → governance ceiling | ✅ | `TIER_GOVERNANCE_MODES` in `governanceMode.ts` |
| Tier ceiling clamping | ✅ | `resolveChallengeGovernance()` in `governanceMode.ts` |
| Org default governance | ✅ | `seeker_organizations.governance_profile` CHECK constraint |
| Per-challenge override | ✅ | `challenges.governance_mode_override` CHECK constraint |
| 3-layer resolution (SQL) | ✅ | `resolve_challenge_governance()` SECURITY DEFINER function |
| 3-layer resolution (client) | ✅ | `resolveChallengeGovernance()` in `governanceMode.ts` |
| Role conflict rules (data) | ✅ | `role_conflict_rules` table — 14 rows |
| Role validation (SQL) | ✅ | `validate_role_assignment()` SQL function |
| Role validation (frontend) | ✅ | `useValidateRoleAssignment` hook |
| HARD_BLOCK UI | ✅ | `ConflictWarningBanner` (red, lock icon) |
| SOFT_WARN UI + checkbox | ✅ | `ConflictWarningBanner` (amber, checkbox) |
| AssignRoleSheet integration | ✅ | `AssignRoleSheet.tsx` — conflict check + banner + gate |
| Auto-assign skip HARD_BLOCK | ✅ | `useAutoAssignChallengeRoles.ts` |
| Auto-assign log SOFT_WARN | ✅ | `audit_trail` insert with `ROLE_CONFLICT_OVERRIDE` |
| Manual challenge assignment | ✅ | `useSolutionRequests.ts` — pre-insert validation |
| QUICK auto-assign all roles | ✅ | `auto_assign_roles_on_creation()` SQL function |
| Engagement model per-challenge | ✅ | `challenges.operating_model` + lock trigger |
| Governance mode selector (Step 0) | ✅ | `StepModeSelection.tsx` |
| `resolveGovernanceMode()` | ✅ | Legacy LIGHTWEIGHT/ENTERPRISE mapped |
| `isStructuredOrAbove` + alias | ✅ | `isEnterpriseGrade` deprecated alias |
| ChallengeWizardPage override write | ✅ | Writes `governance_mode_override` on save |
| Governance badge rendering | ✅ | `GOVERNANCE_MODE_CONFIG` in `governanceMode.ts` |
| Permission guarding | ✅ | `PermissionGuard` + `tier_permissions` table |

---

## 7. AI Review Section Library — COMPLETE

Admin-configurable AI review rules per role context, with DB-driven prompts and configurable model.

| Layer | Status | Location |
|---|---|---|
| `ai_review_section_config` table | ✅ | Composite PK (role_context, section_key), 36 seeded rows |
| `ai_review_global_config` table | ✅ | Singleton — default_model + batch_split_threshold |
| Edge function DB config loading | ✅ | `review-challenge-sections/index.ts` — loads config, falls back to hardcoded |
| Configurable AI model | ✅ | Reads `default_model` from `ai_review_global_config` |
| New role contexts (legal/finance/evaluation) | ✅ | Edge function fetches context-specific data |
| Shared prompt template | ✅ | `src/lib/aiReviewPromptTemplate.ts` + `supabase/functions/.../promptTemplate.ts` |
| Admin config page | ✅ | `/admin/seeker-config/ai-review-config` with PermissionGuard |
| Preview Prompt modal | ✅ | Local string assembly, no API call |
| Route + sidebar | ✅ | `App.tsx` + `AdminSidebar.tsx` |
