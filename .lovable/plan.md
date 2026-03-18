

# CogniBlend Gap Remediation Plan — Phased Implementation

This plan addresses the 19 gaps identified in the BRD v6.3 gap analysis, organized into 6 sequential phases. Each phase is self-contained and does not break existing functionality.

---

## Phase 1: Tier 2 Legal Templates + 3-Tier Access Model (GAP-01, GAP-02)

**Why first:** These block Enterprise publication (GATE-11) and Solution Lifecycle (Phases 7-13).

### 1A — Tier 2 Legal Template Management UI (GAP-01)

**Current state:** All 9 Tier 2 templates are already seeded in `legal_document_templates`. The `LegalDocumentAttachmentPage` already displays both Tier 1 and Tier 2 columns. The `get_required_legal_docs` RPC already resolves templates by maturity + governance. GATE-02 (`validate_gate_02`) already checks for Tier 2 presence.

**What's actually missing:** The BRD requires Tier 2 docs to be *presented to solvers at specific phase triggers* (e.g., IP Transfer at Phase 11, Evaluation Consent at Phase 8). Currently, all Tier 2 docs are attached at challenge creation but there's no phase-triggered presentation to solvers.

**Work:**
- Add a `trigger_phase` column to `legal_document_templates` (migration) — e.g., `solution_eval_consent` triggers at Phase 8, `ip_transfer` at Phase 11.
- Create a `useSolverLegalGate` hook that checks: for the current solution phase, are there Tier 2 docs requiring solver acceptance? If yes, block phase progression until accepted via `legal_acceptance_ledger`.
- Add a `SolverLegalGateModal` component (reuses `ScrollToAcceptLegal` pattern) shown when a solver enters a phase that requires new legal acceptance.

### 1B — 3-Tier Solver Access Model UI (GAP-02)

**Current state:** `ApprovalPublicationConfigTab` already has Visibility and Eligibility dropdowns with rank-based validation (`getMaxEligibilityRank`). However, BRD requires 3 independent tiers: Visibility, Enrollment, and Submission — not just Visibility + Eligibility.

**Work:**
- Add a third dropdown: **Submission** tier to `ApprovalPublicationConfigTab` with options: `all_enrolled`, `shortlisted_only`, `invited_solvers`.
- Add rank hierarchy enforcement: Visibility rank >= Enrollment rank >= Submission rank. Auto-correct narrower tiers on change (same pattern as existing `getMaxEligibilityRank`).
- Map existing `eligibility` field to `enrollment_model` + `submission_model` in the challenges table (migration: add `enrollment_model` and `submission_model` columns).
- For Lightweight: collapse all 3 into a single Public/Private toggle (existing behavior, just map the values).
- Update `AccessModelSummary` component to read from the new columns.

---

## Phase 2: Master Status Rollup + Tier Enforcement (GAP-04, GAP-05)

**Current state:** `update_master_status` DB function already computes all 5 statuses (IN_PREPARATION, ACTIVE, COMPLETED, CANCELLED, TERMINATED). Trigger `trg_challenges_sync_master_status` fires on every challenges update. `check_tier_limit` RPC exists. `useTierLimitCheck` hook exists.

### 2A — Verify Master Status Rollup is Complete (GAP-04)

**Actually mostly done.** The function handles all 5 statuses. The test migration (T08-04 through T08-08) proves it works. What's missing:
- Dashboard display: ensure `CogniDashboardPage` groups challenges by `master_status` (currently uses `phase_status`).
- Update dashboard queries to use `master_status` for grouping/filtering.

### 2B — Enforce Tier Limit at Challenge Creation Entry (GAP-05)

**Current state:** `useTierLimitCheck` is called in `NewSolutionRequestPage` but there's no hard gate at the `/cogni/challenges/new` wizard entry.

**Work:**
- In `ChallengeWizardPage`, call `useTierLimitCheck` on mount. If `allowed === false`, show `TierLimitModal` and block wizard access.
- Add the same check to any "New Challenge" button on the dashboard.

---

## Phase 3: Eligibility Model Selector + Modification Enforcement (GAP-03, GAP-09, GAP-10)

### 3A — Formal Eligibility Model Selector (GAP-03)

**Current state:** Eligibility is set via freeform dropdowns. BRD requires 5 formal codes: CE, IO, DR, OC, plus hybrid.

**Work:**
- Create `ELIGIBILITY_MODELS` constant with the 5 BRD codes + descriptions.
- Replace the eligibility dropdown in `ApprovalPublicationConfigTab` with a model selector that maps to these codes.
- Store as `eligibility_model` column on challenges (migration).
- Wire into `SolverEnrollmentCTA` to branch enrollment flow based on model code.

### 3B — Hard Block on Unaddressed Modification Points (GAP-09)

**Current state:** `ModificationPointsTracker` exists. `useModificationPoints` exists. Amendment records track cycles.

**What's missing:** A hard block at the mutation level preventing resubmission when REQUIRED points have status !== 'ADDRESSED' or 'WAIVED'.

**Work:**
- In `useCompletePhase` (or the relevant resubmission hook), add a pre-flight check: query `amendment_records` for the current cycle, parse `scope_of_change` JSON, and reject if any REQUIRED point is OPEN.
- Add the 3-cycle max check: if `modification_cycle >= 3`, escalate to ID instead of allowing another return.

### 3C — Complete Package Version Snapshot (GAP-10)

**Current state:** `usePublishChallenge` creates a `challenge_package_versions` record with a snapshot object.

**What's missing:** Verify snapshot includes all 16+ required fields, both legal tiers, complexity parameters, targeting filters.

**Work:**
- Expand the `.select()` in `usePublishChallenge` to include `enrollment_model`, `submission_model`, `targeting_filters`, `taxonomy_tags`, `permitted_artifact_types`.
- Include Tier 2 legal docs in the snapshot query.

---

## Phase 4: SLA Automation Hardening (GAP-07, GAP-08, GAP-14)

**Current state:** `check-sla-breaches` edge function already handles: breach processing, tiered escalation (T1-T3), auto-hold, and auto-cancel for ON_HOLD exceeding max days. `process_sla_escalation` DB function exists.

### 4A — Governance-Aware SLA Branching (GAP-07)

**What's missing:** Enterprise = enforce (auto-hold on breach), Lightweight = inform only (no auto-hold).

**Work:**
- In `process_sla_escalation` DB function, join `challenges.governance_profile`. If LIGHTWEIGHT, skip the auto-hold update and only create notification records.
- Add a `governance_profile` check in the `check-sla-breaches` edge function's auto-cancel logic (Lightweight should warn but not auto-cancel).

### 4B — SLA Duration from Phase Schedule (GAP-14)

**What's missing:** When a phase starts, SLA timer duration should be set from the challenge's `phase_schedule` JSON.

**Work:**
- In the `start_sla_timer` DB function (or `complete_phase`), read `phase_schedule` JSON for the target phase's `duration_days` and use it to set the timer's `deadline_at`.
- Add `parsePhaseScheduleThresholds` (already exists in `slaEscalationService.ts`) as the frontend utility for display.

### 4C — Percentage-Based SLA Alerts (GAP-08 partial)

**Work:**
- In `check-sla-breaches`, add 80% warning: compute `elapsed / duration`. If >= 0.8 and < 1.0 and no warning sent yet, create a warning notification.
- Add a `warning_sent_at` column to `sla_timers` to prevent duplicate warnings.

---

## Phase 5: Operating Model Lock + Communication Permissions + Legal Re-acceptance (GAP-15, GAP-13, GAP-16)

### 5A — Frontend Guard for Operating Model Lock (GAP-15)

**Current state:** DB trigger `trg_challenges_lock_operating_model` already blocks updates at DB level.

**Work:**
- In wizard/edit UI, disable the operating model selector when `master_status === 'ACTIVE'`. Show lock icon with tooltip "Operating model is locked after publication."

### 5B — Role-to-Role Communication Permission Matrix (GAP-13)

**Work:**
- Migration: create `communication_permissions` table (from_role TEXT, to_role TEXT, challenge_phase_min INT, challenge_phase_max INT, allowed BOOLEAN).
- Seed with BRD rules (e.g., Solver cannot message ER directly; must go through CU).
- In Q&A/communication hooks, add a pre-check: query `communication_permissions` for the sender's role and recipient's role.

### 5C — Legal Re-acceptance Suspension on Window Expiry (GAP-16)

**Current state:** `LegalReAcceptModal` and `useLegalReacceptance` exist. `legal_reacceptance_records` with 7-day deadline exist.

**What's missing:** Auto-suspension of solver enrollment when the 7-day window expires without re-acceptance.

**Work:**
- Add logic to `check-sla-breaches` (or a new scheduled function) to scan `legal_reacceptance_records` where `deadline < NOW()` and `status = 'PENDING'`. For each, update the solver's enrollment status to `SUSPENDED_PENDING_REACCEPTANCE`.
- Show "Suspended — Pending Re-acceptance" badge in solver dashboard.

---

## Phase 6: Taxonomy Auto-Suggestion + Solver Matchmaking (GAP-11, GAP-12, GAP-17, GAP-18, GAP-19)

These are lower priority and can be addressed incrementally.

### 6A — Taxonomy Auto-Suggestion (GAP-11)

**Work:**
- Create an edge function `suggest-taxonomy-tags` that takes problem statement text and matches against `industry_segments`, `sub_domains`, and `specialities` master data using text similarity.
- Call from the Solution Request form when problem statement > 100 chars (debounced). Display as clickable chips (pattern already exists with keyword extraction).

### 6B — Solver Matchmaking Stub (GAP-12)

**Work:**
- Create `useMatchingSolvers` hook that queries `solver_profiles` joined with proficiency data, filtering by the challenge's taxonomy and complexity level.
- Replace the simple count in `usePublicationReadiness` with this real matchmaking query.
- Display matched solver count + breakdown on `PublicationReadinessPage`.

### 6C — Deferred Items (GAP-17, 18, 19)

- **GAP-17** (Solution Cluster): Already compliant — flag exists.
- **GAP-18** (AI Similarity Watch): Enterprise-only, post-Phase 10. Defer to future sprint.
- **GAP-19** (Direct Pay for AGG): Payment variant. Defer to future sprint.

---

## Execution Order Summary

```text
Phase 1  ──► Tier 2 Legal triggers + 3-Tier Access UI
Phase 2  ──► Master Status dashboard + Tier enforcement gate
Phase 3  ──► Eligibility models + Modification hard blocks + Package snapshot
Phase 4  ──► SLA governance branching + duration linking + alerts
Phase 5  ──► Operating model frontend lock + Comms permissions + Legal expiry
Phase 6  ──► Taxonomy suggestions + Matchmaking + Deferred items
```

Each phase produces a testable increment. No existing tables, components, or hooks are modified destructively — all changes are additive columns, new components, or enhanced logic within existing hooks.

