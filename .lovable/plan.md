

# Governance & Lifecycle Overhaul — Implementation Plan

This is a large-scale refactoring across database schema, admin UI, and frontend logic. Due to the scope (10 sequential steps with cross-cutting dependencies), this plan breaks the work into **10 sequential implementation prompts** to avoid overwhelming any single change.

---

## Step 1: Database Migration (Single migration, all SQL)

Create one migration file containing sections 1.1 through 1.10 from the spec:

- **1.1** `md_governance_mode_config` table + seed 3 rows (QUICK, STRUCTURED, CONTROLLED) with legal/escrow/curation/evaluation/award behavior columns
- **1.2** `md_tier_governance_access` table + seed 9 rows mapping tier codes to allowed modes with defaults
- **1.3** Fix `role_conflict_rules`: drop old constraints, add binary-only constraints (HARD_BLOCK/ALLOWED only, no SOFT_WARN), delete all existing rules, insert 8 rules (2 STRUCTURED + 6 CONTROLLED)
- **1.4** Deactivate dead roles (AM, RQ, ID, CA) in `platform_roles`, normalize ENTERPRISE→STRUCTURED and LIGHTWEIGHT→QUICK in `seeker_organizations`, `challenges`, remap legacy role codes in `user_challenge_roles`
- **1.5** Add `lc_compliance_complete` and `fc_compliance_complete` boolean columns to `challenges`
- **1.6** Fix `challenge_role_assignments` constraints for role_code, assignment_phase, and status
- **1.7** Rewrite `get_phase_required_role` for 10-phase lifecycle
- **1.8** Rewrite `validate_role_assignment` — binary only, no SOFT_WARN path
- **1.9** Remap existing challenge `current_phase` values from 13-phase to 10-phase
- **1.10** RLS on new tables (public SELECT, supervisor-only write)

**Constraint notes**: The `user_roles` table uses `app_role` enum — the RLS policies reference `role IN ('platform_admin','supervisor')` which must match existing enum values. Will verify before executing.

---

## Step 2: Frontend Cleanup — governanceMode.ts + cogniRoles.ts

**`src/lib/governanceMode.ts`:**
- Replace `resolveGovernanceMode()` with strict validator (only accepts QUICK/STRUCTURED/CONTROLLED, defaults to STRUCTURED for null/undefined, throws for invalid values like ENTERPRISE/LIGHTWEIGHT)
- Remove `isEnterpriseGrade` deprecated alias
- Remove `TIER_GOVERNANCE_MODES` hardcoded map
- Update `getAvailableGovernanceModes()` signature to accept tier data from hook (parameter-based, not hardcoded)
- Update `getDefaultGovernanceMode()` and `resolveChallengeGovernance()` to use the new strict resolver

**`src/types/cogniRoles.ts`:**
- Remove `LEGACY_ROLE_ALIASES` map
- Remove `resolveRoleCode()` function
- Update `getPrimaryRole()` to work without legacy resolution

---

## Step 3: Hook & Component Cleanup

**`src/hooks/cogniblend/useCogniUserRoles.ts`:**
- Remove `resolveRoleCode` import and `.map(resolveRoleCode)` call (DB is now clean)

**`src/hooks/cogniblend/useValidateRoleAssignment.ts`:**
- Remove `SOFT_WARN` from `RoleConflictResult` type (only `HARD_BLOCK | ALLOWED`)
- Remove SOFT_WARN handling in both the stateless function and the hook

**`src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`:**
- Remove SOFT_WARN branch in `findValidCandidate()` (only HARD_BLOCK → skip, ALLOWED → use)

**`src/hooks/queries/useSolutionRequests.ts`:**
- Remove SOFT_WARN override logging block (~lines 271-288)

**`src/components/rbac/roles/ConflictWarningBanner.tsx`:**
- Remove entire SOFT_WARN amber banner section, keep only HARD_BLOCK and ALLOWED handling
- Remove `acknowledged`/`onAcknowledgeChange` props

**`src/components/org-settings/GovernanceProfileTab.tsx`:**
- Remove LIGHTWEIGHT fallback on line 52
- Update CONTROLLED description: "10 lifecycle phases" instead of "13"

**`src/components/cogniblend/demo/DemoWorkflowSteps.tsx`:**
- Update steps to reflect 10-phase lifecycle: Create → Compliance → Curation → Publication → (solver phases)

**Update all `isEnterpriseGrade` callers** (7 files): Replace with `isStructuredOrAbove` import.

---

## Step 4: New Governance Data Hooks

**`src/hooks/queries/useGovernanceModeConfig.ts`:**
- React Query hook fetching `md_governance_mode_config` for a given governance mode
- Used by submit flow, curation page, Phase 2 logic

**`src/hooks/queries/useTierGovernanceAccess.ts`:**
- React Query hook fetching `md_tier_governance_access` for a given tier code
- Returns available modes + default mode
- Replaces hardcoded `TIER_GOVERNANCE_MODES`

---

## Step 5: Admin Sidebar + Routes

**`src/components/admin/AdminSidebar.tsx`** (after line 114 "Governance Rules"):
- Add 3 new entries: Governance Modes (Settings2), Role Convergence (GitMerge), Tier Access (Lock)

**`src/App.tsx`:**
- Add 3 lazy imports + 3 Route entries under seeker-config with `PermissionGuard permissionKey="seeker_config.edit"`

---

## Step 6: Governance Mode Config Admin Page

**Route:** `/admin/seeker-config/governance-mode-config`

**New files:**
- `src/pages/admin/seeker-config/GovernanceModeConfigPage.tsx` — Page shell (<150 lines), fetches 3 rows from `md_governance_mode_config`, renders 3 `GovernanceModeCard` components
- `src/components/admin/governance/GovernanceModeCard.tsx` — Single card with colored header (green/blue/purple). Sections: Legal Docs (Phase 2), Escrow (Phase 2), Curation (Phase 3), Evaluation (Phase 6/8), Award (Phase 9). React Hook Form + Zod. QUICK card has most toggles read-only. Save per card via `withUpdatedBy()`.

---

## Step 7: Role Convergence Matrix Admin Page

**Route:** `/admin/seeker-config/role-convergence`

**New files:**
- `src/pages/admin/seeker-config/RoleConvergencePage.tsx` — Page shell with 3 tabs (QUICK, STRUCTURED, CONTROLLED)
- `src/components/admin/governance/RoleConvergenceMatrix.tsx` — 5x5 interactive matrix (CR, CU, ER, LC, FC). Diagonal = gray dash. Upper triangle = toggle (green ALLOWED / red BLOCKED). Lower mirrors upper. QUICK tab is read-only (all green).
- `src/lib/convergenceUtils.ts` — Summary calculator: block count, implied minimum team size

Save logic: delete existing rules for governance_profile, re-insert based on matrix state.

---

## Step 8: Tier Governance Access Admin Page

**Route:** `/admin/seeker-config/tier-governance-access`

**New files:**
- `src/pages/admin/seeker-config/TierGovernanceAccessPage.tsx` — Table with rows = tiers (basic, standard, premium, enterprise), columns = QUICK/STRUCTURED/CONTROLLED. Checkbox for access, radio for default. At least one mode per tier required, one default per tier.

---

## Step 9: complete_phase Rewrite (Migration)

New migration replacing `complete_phase` function:
- 10-phase progression: 1→2→3→4→5→6→7→8→9→10→NULL
- Phase 2→3 gate: requires `lc_compliance_complete AND fc_compliance_complete`
- On advancing TO Phase 2: read `md_governance_mode_config` for challenge's governance mode. If `legal_doc_mode = 'auto_apply'`, auto-attach defaults + set `lc_compliance_complete = TRUE`. If `escrow_mode = 'not_applicable'`, set `fc_compliance_complete = TRUE`.
- Same-actor recursive auto-complete retained with new 5-role codes

---

## Step 10: Assignment Pipeline Fix (Migration + Code)

**Migration:** Create `assign_challenge_role` SECURITY DEFINER RPC that:
1. Resolves challenge governance mode
2. Calls `validate_role_assignment` (binary)
3. Inserts/upserts into `user_challenge_roles`
4. Logs to `audit_trail`

**Code changes:**
- `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts`: Replace direct Supabase inserts with `assign_challenge_role` RPC calls
- `src/hooks/cogniblend/useSubmitSolutionRequest.ts`: After `complete_phase`, call `assign_challenge_role` for CU assignment

---

## Execution Order

| # | Step | Type |
|---|------|------|
| 1 | Database migration (1.1–1.10) | SQL |
| 2 | governanceMode.ts + cogniRoles.ts cleanup | Code |
| 3 | Hook and component cleanup (SOFT_WARN, legacy roles, isEnterpriseGrade) | Code |
| 4 | New governance hooks (useGovernanceModeConfig, useTierGovernanceAccess) | Code |
| 5 | Sidebar + routes | Code |
| 6 | Governance Mode Config page | Feature |
| 7 | Role Convergence page | Feature |
| 8 | Tier Governance Access page | Feature |
| 9 | complete_phase rewrite | SQL |
| 10 | Assignment pipeline fix | Code + SQL |

## Risk Notes

- **Phase remapping (1.9)**: Existing challenges with phases 6 (unused in mapping) will keep their value — need to verify if phase 6 exists in current data
- **isEnterpriseGrade removal**: 7 files reference this deprecated alias — all must be updated in Step 3
- **86 files match ENTERPRISE/LIGHTWEIGHT**: Many are comments, test files, or unrelated (e.g., `is_enterprise` column on subscription tiers, `enterprise_contact_requests` table). Only governance-related string literals need updating.
- **`useCurrentOrg.ts` line 82**: Defaults to `'LIGHTWEIGHT'` — must change to `'QUICK'` in Step 3

