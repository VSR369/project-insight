

# Remediation Plan: Closing R-01 through R-08

## Phase 7: Low-Risk Verification Fixes (R-01, R-03, R-06, R-08)

### R-01 — Solution Request 100-char minimum
**Finding:** The challenge wizard already enforces 200-char (Lightweight) / 500-char (Enterprise) minimums for `problem_statement` via Zod schema. BRD §5.1 requires 100 chars minimum for the Solution Request form, which is a separate flow from the wizard. However, no Solution Request form exists in the codebase yet -- the memory references it but the pages/components don't exist.
**Action:** No change needed. The wizard already exceeds the BRD minimum. If/when the Solution Request form is built, it should enforce `min(100)`. Mark as **compliant**.

### R-03 — 14-point curation checklist
**Finding:** `CurationChecklistPanel.tsx` already defines exactly 14 items (lines 293-308: Problem Statement, Scope, Deliverables, Eval weights=100%, Reward, Phase schedule, Submission guidelines, Eligibility, Taxonomy tags, Tier 1 legal, Tier 2 legal, Complexity params, Maturity level, Artifact types).
**Action:** Item 14 ("Artifact types configured") exists but `isFilled` is hardcoded to `false` (placeholder). Fix the auto-check logic to actually verify `permitted_artifact_types` from the challenge's deliverables JSON.

**File:** `src/pages/cogniblend/CurationChecklistPanel.tsx`
- Line 288: Change `/* 14 */ false` to check if `permitted_artifact_types` array exists and has length > 0 in the challenge deliverables JSON.

### R-06 — Evaluation rubric weight sum in GATE-11
**Finding:** `usePublicationReadiness.ts` does NOT check that evaluation criteria weights sum to 100%. The curation checklist checks it (item 4), but GATE-11 does not repeat the check.
**Action:** Add an `eval_weights` check to the Enterprise GATE-11 checklist in `buildEnterpriseChecks()`.

**File:** `src/hooks/cogniblend/usePublicationReadiness.ts`
- In `buildEnterpriseChecks()`, parse `c.evaluation_criteria` as array, sum `weight_percentage` fields, add a new check item: `{ id: 'eval_weights', label: 'Evaluation criteria weights sum to 100%', passed: weightSum === 100 }`.

### R-08 — Complexity scoring formula verification
**Finding:** `ApprovalPublicationConfigTab.tsx` already implements the weighted formula correctly:
```
COMPLEXITY_PARAMS.reduce((sum, p) => sum + paramValues[p.key] * p.weight, 0)
```
With 7 parameters and weights summing to 1.0 (0.20 + 0.15 + 0.15 + 0.15 + 0.15 + 0.10 + 0.10), producing a 1-10 scale. The BRD specifies normalized 1-5; the 6th param weight is 0.10 (timeline_urgency). Need to verify the 7th param exists.
**Action:** Check if 7 params exist (search showed 6 with a `...` truncation at line 164). If only 6, add the 7th (`stakeholder_count`, weight 0.10). Also verify the scale normalizes to 1-5 per BRD (current scale is 1-10 since slider range is 1-10 and weights sum to 1.0; may need to divide by 2 or adjust slider to 1-5).

**File:** `src/components/cogniblend/approval/ApprovalPublicationConfigTab.tsx`
- Verify all 7 parameters present; add missing 7th if needed.
- Adjust `getComplexityLevel()` thresholds if scale is already correct (sliders 1-10, weights sum to 1.0 = score range 1-10 matches the existing level brackets).

---

## Phase 8A: Governance-Aware Tier 2 Filtering (R-04)

**Finding:** `useSolverLegalGate.ts` fetches ALL active Tier 2 templates with `trigger_phase <= currentPhase`, regardless of governance profile. Enterprise-only docs (e.g., Escrow Terms) should be skipped for Lightweight challenges.

**Action:**
1. Add `governance_profile` parameter to `useSolverLegalGate` hook signature.
2. Add a `governance_scope` column to `legal_document_templates` (or use an existing field) to tag docs as `ALL`, `ENTERPRISE_ONLY`, or `LIGHTWEIGHT_ONLY`.
3. If adding a column is too invasive, use a simpler approach: filter by `document_type` naming convention. Templates with `_ENTERPRISE` suffix in their `document_type` are skipped when `governance_profile === 'LIGHTWEIGHT'`.

**Preferred approach (no migration needed):**
- In `useSolverLegalGate`, accept `governanceProfile` as a 4th parameter.
- After fetching templates, filter out docs where `document_type` contains "ESCROW" or known Enterprise-only types when governance is LIGHTWEIGHT.
- Define a constant `ENTERPRISE_ONLY_DOC_TYPES = ['ESCROW_TERMS', 'IP_ASSIGNMENT_DEED', ...]` based on BRD Tier 2 matrix.

**Files:**
- `src/hooks/cogniblend/useSolverLegalGate.ts` — Add `governanceProfile` param, filter Enterprise-only doc types for Lightweight.
- All call sites of `useSolverLegalGate` — Pass the challenge's `governance_profile`.

---

## Phase 8B: Anti-Disintermediation Check in Communication (R-07)

**Finding:** `useCommunicationPermission` checks role-to-role rules but never checks the solver's `ad_accepted` flag from `solver_enrollments`. BRD BR-AD-001-005 requires AGG model solvers to accept an AD agreement before direct messaging.

**Action:**
1. Add `challengeId` and `senderId` parameters to `useCommunicationPermission` and `checkCommunicationPermission`.
2. When role-to-role check passes, perform a secondary check: query the challenge's `operating_model`. If it's AGG, query `solver_enrollments` for the sender to verify `ad_accepted === true`.
3. If `ad_accepted` is false, return `{ allowed: false, reason: 'AD agreement required for AGG messaging.' }`.

**Files:**
- `src/hooks/cogniblend/useCommunicationPermission.ts` — Add AGG + `ad_accepted` check.
- Call sites — Pass `challengeId` and `senderId` where available.

---

## Phase 8C: Maturity-to-Artifact Auto-Population Verification (R-02)

**Finding:** `StepRequirements.tsx` already has `ARTIFACT_TIERS` mapping and a `useEffect` that auto-populates `permitted_artifact_types` when `maturity_level` changes (lines 154-157). The mapping matches the BRD:
- Blueprint → Document, Presentation, Diagram
- PoC → above + Data/Evidence, Video Demo
- Prototype → above + Source Code, Hardware Specs, API Documentation
- Pilot → above + Field Data, Deployment Guide, Metrics Report

**Action:** This is already implemented. Mark as **compliant**. The only gap is that the data isn't persisted to the `deliverables` JSON column with the `permitted_artifact_types` key during save. Need to verify `useSaveChallengeStep` includes `permitted_artifact_types` in the save payload.

**File:** Verify in `ChallengeWizardPage.tsx` that the save logic maps `form.permitted_artifact_types` into the challenge update payload (either as a top-level column or nested in `deliverables` JSON).

---

## Phase 8D: Enrollment Approval Queue for Non-OC Models (R-05)

**Finding:** `useSolverEnrollment.ts` has `autoApprove` as a parameter in `useEnrollInChallenge`. The caller (`SolverEnrollmentCTA.tsx`) determines whether to auto-approve based on enrollment model. However, there is no admin-facing approval queue page for PENDING enrollments.

**Action:**
1. Verify `SolverEnrollmentCTA.tsx` correctly sets `autoApprove: false` for CE, IO, DR models.
2. Create a lightweight enrollment approval queue component (or add to existing admin dashboard) that:
   - Lists `solver_enrollments` with `status = 'PENDING'` for the current challenge.
   - Allows ID/AM to approve or reject with audit trail.
3. Add an `useApproveEnrollment` mutation hook.

**Files:**
- `src/components/cogniblend/solver/SolverEnrollmentCTA.tsx` — Verify auto-approve logic.
- `src/hooks/cogniblend/useSolverEnrollment.ts` — Add `useApproveEnrollment` and `useRejectEnrollment` mutations.
- `src/components/cogniblend/solver/EnrollmentApprovalQueue.tsx` (new) — Admin queue UI.
- Integration point: embed in `ChallengeManagePage.tsx` or as a tab in the approval review.

---

## Execution Order

| Phase | Gaps | Risk | Estimated Changes |
|-------|------|------|-------------------|
| **Phase 7** | R-01, R-03, R-06, R-08 | Low | 3 files, minor edits |
| **Phase 8A** | R-04 | Medium | 1 hook + call sites |
| **Phase 8B** | R-07 | Medium | 1 hook + call sites |
| **Phase 8C** | R-02 | Low | Verification + possible save fix |
| **Phase 8D** | R-05 | Medium | 1 new component + 1 hook update |

No database migrations required for Phases 7-8B. Phase 8D may need no schema changes since `solver_enrollments` already has the `status`, `approved_at`, and `approved_by` columns.

