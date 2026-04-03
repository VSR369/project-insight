

# Implementation Plan — Steps 4-10 (Remaining)

Steps 1-3 are verified complete. Seven steps remain. One minor Step 3 item (DemoWorkflowSteps update) was missed and will be folded into Step 4.

---

## Step 4: New Governance Hooks + DemoWorkflowSteps Fix

**New files:**

- `src/hooks/queries/useGovernanceModeConfig.ts` — React Query hook fetching from `md_governance_mode_config` by governance mode. Returns legal/escrow/curation/evaluation/award config. `staleTime: 5min` (reference data).

- `src/hooks/queries/useTierGovernanceAccess.ts` — React Query hook fetching from `md_tier_governance_access` by tier code. Returns available modes + default. `staleTime: 5min`.

**Edit:**

- `src/components/cogniblend/demo/DemoWorkflowSteps.tsx` — Update `buildSteps()` to reflect 10-phase lifecycle: Create → Compliance (LC+FC) → Curation → Publication → Abstract Submit → Abstract Review → Solution Submit → Solution Review → Award → Payment. Show first 5 seeker-side phases in the visual stepper.

---

## Step 5: Admin Sidebar + Routes

**Edit `src/components/admin/AdminSidebar.tsx`:**
- Add 3 entries after "Governance Rules": Governance Modes (Settings2), Role Convergence (GitMerge), Tier Access (Lock)

**Edit `src/App.tsx`:**
- Add 3 lazy imports and Route entries under `seeker-config/` with `PermissionGuard permissionKey="seeker_config.edit"`

---

## Step 6: Governance Mode Config Page

**New files:**

- `src/pages/admin/seeker-config/GovernanceModeConfigPage.tsx` — Page shell fetching 3 rows, renders 3 `GovernanceModeCard` components. Under 150 lines.

- `src/components/admin/governance/GovernanceModeCard.tsx` — Card with colored header (green/blue/purple). Sections: Legal Docs (Phase 2), Escrow (Phase 2), Curation (Phase 3), Evaluation (Phase 6/8), Award (Phase 9). React Hook Form + Zod. QUICK card has most toggles read-only. Save per card with `withUpdatedBy()`.

---

## Step 7: Role Convergence Matrix Page

**New files:**

- `src/pages/admin/seeker-config/RoleConvergencePage.tsx` — Page shell with 3 tabs. Under 150 lines.

- `src/components/admin/governance/RoleConvergenceMatrix.tsx` — 5x5 matrix grid. Diagonal = gray dash. Upper triangle = toggle (green/red). Lower mirrors upper. QUICK tab read-only with banner.

- `src/lib/convergenceUtils.ts` — Block count calculator and minimum team size derivation.

Save: delete+re-insert rules for the governance_profile.

---

## Step 8: Tier Governance Access Page

**New file:**

- `src/pages/admin/seeker-config/TierGovernanceAccessPage.tsx` — Table: rows = tiers (basic, standard, premium, enterprise), columns = QUICK/STRUCTURED/CONTROLLED. Checkbox for access, radio for default. Validation: at least one mode per tier, one default per tier.

---

## Step 9: complete_phase Rewrite (Migration)

New migration replacing the `complete_phase` function:

- **Phase progression:** 1→2→3→4→5→6→7→8→9→10→NULL (replacing the old 13-phase map that currently goes 5→7, 10→11→12→13)
- **Phase 2→3 gate:** Check `lc_compliance_complete AND fc_compliance_complete`. Replace old `validate_gate_03` call.
- **On advance TO Phase 2:** Read `md_governance_mode_config` for challenge's governance mode. If `legal_doc_mode = 'auto_apply'`, set `lc_compliance_complete = TRUE`. If `escrow_mode = 'not_applicable'`, set `fc_compliance_complete = TRUE`.
- **Remove old gate calls:** Remove `validate_gate_03` and `validate_gate_04` checks (replaced by new Phase 2 compliance gate).
- **Same-actor recursive auto-complete:** Retain existing logic using updated 5 role codes.

---

## Step 10: Assignment Pipeline Fix (Migration + Code)

**Migration:** Create `assign_challenge_role` SECURITY DEFINER RPC:
1. Resolve challenge governance mode from `COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')`
2. Call `validate_role_assignment` (binary check)
3. Upsert into `user_challenge_roles`
4. Log to `audit_trail`

**Code changes:**

- `src/hooks/cogniblend/useAutoAssignChallengeRoles.ts` — Replace `persistViaRpc` (which calls `auto_assign_challenge_role`) with calls to new `assign_challenge_role` RPC. Pool member lookup stays the same; only the final persistence changes.

- `src/hooks/cogniblend/useSubmitSolutionRequest.ts` — After `complete_phase` succeeds, call `assign_challenge_role` to assign CU.

---

## Execution Order

| # | What | Type |
|---|------|------|
| 1 | Step 4: Hooks + DemoWorkflowSteps fix | Code |
| 2 | Step 5: Sidebar + routes | Code |
| 3 | Step 6: Governance Mode Config page | Feature |
| 4 | Step 7: Role Convergence page | Feature |
| 5 | Step 8: Tier Governance Access page | Feature |
| 6 | Step 9: complete_phase rewrite | SQL migration |
| 7 | Step 10: Assignment pipeline fix | Code + SQL |

