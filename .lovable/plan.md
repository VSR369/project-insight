

# CORRECTED BRD Compliance Plan: Challenge Life Cycle Management v3.1

## Corrections Applied

1. **Lovable Correction #2 was WRONG** — "AI preserves Creator intent" for `preferred_approach` and `approaches_not_of_interest` IS already implemented in `promptTemplate.ts`. Removed from gap list.
2. **Governance selector stays on Creator page** — per BRD §6.4, the `GovernanceEngagementSelector` component is retained. Only TrackCard/ActiveView/AI-intake/Wizard rendering is removed.
3. **Added**: `role_conflict_rules` cleanup for deprecated AM/RQ/ID entries (Phase 2 addition).
4. **Added**: `md_governance_field_rules` verification for Creator form field keys (Phase 1 prerequisite).

---

## Phase 1: Creator Page Rewrite + Governance-Aware Form (CRITICAL)

**~350 lines changed across 4 files**

### 1a. Rewrite `ChallengeCreatePage.tsx` (531→~130 lines)

**REMOVE:**
- `TrackCard` component (lines 95-141)
- `GovernanceFooter` component (lines 144-168)
- `SharedIntakeState` type + state (lines 47-53, 307-312)
- `ActiveView` type + all view-switching logic (lines 45, 360-390)
- `ConversationalIntakeContent` rendering (lines 447-466)
- `ChallengeWizardPage` rendering (lines 468-486)
- Landing view with track cards (lines 488-530)
- Imports: `ConversationalIntakeContent`, `ChallengeWizardPage`, `GeneratedSpec`, `ChallengeTemplate`, `Sparkles`, `Settings2`, `ChevronLeft`
- `demoPath` / `resolvedTab` / `paramTab` logic (lines 360-378)
- `useCogniPermissions` import (no longer needed here)

**KEEP:**
- `GovernanceEngagementSelector` component (lines 170-297) — this stays per BRD §6.4
- `useCurrentOrg`, `useOrgModelContext` hooks
- Governance mode state + demo sessionStorage reads
- Engagement model state + demo sessionStorage reads
- Loading skeleton, no-org guard
- `CreationContextBar`

**NEW structure:** Page header + `GovernanceEngagementSelector` + `ChallengeCreatorForm` with `governanceMode` and `engagementModel` props.

### 1b. Make `ChallengeCreatorForm` governance-aware

- Accept `governanceMode` prop
- Build dynamic Zod schema per mode:
  - **QUICK**: `title`, `problem_statement` (min 100 chars), `maturity_level`, `domain_tags`, `budget_min/max` (MP only) required. Others optional with sensible defaults.
  - **STRUCTURED** (current default): All 8 essential fields required as-is.
  - **CONTROLLED**: All 8 essential + `context_background`, `root_causes`, `affected_stakeholders`, `current_deficiencies`, `preferred_approach` required.
- Query `useGovernanceFieldRules(governanceMode)` for database-driven overrides (with static fallback if no rules exist).

### 1c. Store `governance_mode_override` in `useSubmitSolutionRequest.ts`

Add to the `.update()` payload at line 82:
```
governance_mode_override: payload.governanceModeOverride ?? null,
```
Add `governanceModeOverride?: string` to `SubmitPayload` interface.

### 1d. Add IP-EL to `EssentialDetailsTab.tsx`

Add to `IP_OPTIONS` array:
```
{ value: 'IP-EL', label: 'Exclusive license', desc: 'Solver licenses exclusively to your org' },
```

### 1e. Master data verification

Verify `md_governance_field_rules` has entries for Creator form field keys: `title`, `problem_statement`, `scope`, `maturity_level`, `domain_tags`, `budget_min`, `budget_max`, `ip_model`, `expected_outcomes`, `context_background`, `preferred_approach`, `approaches_not_of_interest`, `affected_stakeholders`, `current_deficiencies`, `root_causes`, `expected_timeline`. Insert missing rows for QUICK/STRUCTURED/CONTROLLED modes.

---

## Phase 2: Role Assignment Fixes (~30 lines across 4 files)

### 2a. Remove ID auto-assign from `AISpecReviewPage.tsx`

Delete the two `autoAssignChallengeRole({ roleCode: 'ID' })` blocks at lines ~1341-1349 and ~1451-1459.

### 2b. Fix cancel permission in `useCancelChallenge.ts`

Line 74: Change `return userRoleCodes.includes('ID')` to `return userRoleCodes.includes('CU')`.

### 2c. LC/FC assignment source (TODO + comment)

In `useAutoAssignChallengeRoles.ts`, add TODO comment at line 41 noting LC/FC should query seeker org's `org_users` table, not `platform_provider_pool`. Current behavior fails gracefully (returns null) so not blocking.

### 2d. Clean up `role_conflict_rules` master data

Delete or soft-deactivate rows referencing AM, RQ, and ID role codes. These cause ghost warnings if legacy codes surface.

---

## Phase 3: Legal & Escrow Governance (~150 lines across 3 files)

### 3a. QUICK mode: auto-attach Tier 1 legal defaults

In `useSubmitSolutionRequest.ts`, after `complete_phase` call, if governance mode is QUICK: insert default legal docs (NDA, Challenge Terms, Data Protection) into `challenge_legal_docs` with `status: 'auto_accepted'`. Query `md_legal_document_types` for `is_default = true` templates.

### 3b. STRUCTURED mode: "Accept All Legal Defaults" button

In `CurationReviewPage.tsx` legal docs tab, add a button that bulk-updates all `ai_suggested` docs to `ATTACHED` when governance is STRUCTURED.

### 3c. STRUCTURED mode: escrow enable/disable toggle

Add a toggle switch at top of escrow section in `CurationReviewPage.tsx`. When STRUCTURED, escrow is optional (toggle). When CONTROLLED, escrow is mandatory (no toggle, always enabled).

---

## Phase 4: Dashboard & Navigation (~100 lines across 2-3 files)

### 4a. Unified dashboard

Modify `CogniDashboardPage` to show action items across ALL user roles simultaneously instead of filtering by `activeRole`. Each card shows a role badge.

### 4b. MP Creator navigation restriction

In CogniBlend sidebar, hide curation/legal/review nav items for MP Creators whose challenges are past Phase 1 (they can only see read-only status).

---

## Phase 5: Demo Cleanup + Tier Gating (~80 lines across 2 files)

### 5a. Simplify `DemoLoginPage.tsx`

- Remove `DemoPath` type export
- Remove AI/Manual two-tab split in user cards
- All Creator destinations → `/cogni/challenges/create` (no `?tab=` params)
- Remove `sessionStorage.setItem('cogni_demo_path', ...)` calls
- Keep governance mode + engagement model selectors

### 5b. Update `App.tsx` routing

Change redirect: `/cogni/challenges/new` → `/cogni/challenges/create` (remove `?tab=editor`).

### 5c. Tier-gate engagement model

In `ChallengeCreatePage`, query `md_tier_engagement_access` to filter available engagement models for the org's tier (Basic = MP only, Standard+ = MP+AGG).

---

## Execution Priority

```text
Phase 1 (CRITICAL) → Phase 2 (HIGH) → Phase 3 (HIGH) → Phase 4 (MEDIUM) → Phase 5 (LOW)
   Creator Form         Role Fixes       Legal/Escrow      Dashboard UX       Demo Cleanup
   4 files, ~350 LOC    4 files, ~30     3 files, ~150     2-3 files, ~100    2 files, ~80
```

Total: ~710 lines across ~15 files. No new database tables. Master data inserts for governance field rules and role_conflict_rules cleanup.

