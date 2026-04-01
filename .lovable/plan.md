

# Business Analysis: Governance Field Segregation Review

## Current State (from DB)

Here is the complete field matrix across all 3 governance modes:

### Tab 1 — Challenge Brief (Step 1)

| Field | QUICK | STRUCTURED | CONTROLLED | BA Assessment |
|-------|-------|------------|------------|---------------|
| Title | Required | Required | Required | Correct |
| Hook (tagline) | Optional | Optional | Required | Correct |
| Description | Optional | Optional | Required | Correct |
| Problem Statement | Required | Required | Required | Correct |
| Scope | **Hidden** | Required | Required | Correct |
| Domain Tags | Required | Required | Required | Correct |
| Taxonomy Tags | Optional | Optional | Optional | Correct |
| Maturity Level | Required | Required | Required | Correct |
| Context Background | Hidden | Optional | Required | Correct |
| Detailed Description | Hidden | Optional | Required | Correct |
| Root Causes | Hidden | Optional | Required | Correct |
| Affected Stakeholders | Hidden | Optional | Required | Correct |
| Current Deficiencies | Hidden | Optional | Required | Correct |
| Expected Outcomes | Required | **Optional** | Required | **Issue — should be Required** |
| Preferred Approach | Hidden | Optional | Optional | Correct |
| Approaches Not of Interest | Hidden | Optional | Optional | Correct |
| Industry Segment | Optional | Optional | Required | Correct |
| Experience Countries | Optional | Optional | Required | Correct |
| Deliverables List | Required | Required | Required | Correct |
| Submission Guidelines | Optional | Optional | Required | Correct |

### Tab/Step 2 — Evaluation

| Field | QUICK | STRUCTURED | CONTROLLED |
|-------|-------|------------|------------|
| Weighted Criteria | Required | Required | Required | Correct |

### Tab/Step 3 — Rewards & Payment

| Field | QUICK | STRUCTURED | CONTROLLED | BA Assessment |
|-------|-------|------------|------------|---------------|
| Reward Type | Required | Required | Required | Correct |
| Reward Description | Optional | Optional | Required | Correct |
| Currency Code | Required | Required | Required | Correct |
| Platinum Award | Required | Required | Required | Correct |
| Gold Award | Required | Required | Required | **Issue — QUICK should be Optional** |
| Silver Award | Optional | Optional | Required | Correct |
| Num Rewarded Solutions | Required | Required | Required | Correct |
| Effort Level | Optional | Optional | Required | Correct |
| Rejection Fee % | Required | Required | Required | **Issue — QUICK should be Auto** |
| Payment Mode | Hidden | Required | Required | Correct |
| Payment Milestones | Hidden | Required | Required | Correct |
| IP Model | **Auto** | Required | Required | Correct |

### Tab/Step 4 — Timeline

| Field | QUICK | STRUCTURED | CONTROLLED | BA Assessment |
|-------|-------|------------|------------|---------------|
| Submission Deadline | Optional | Required | Required | **Issue — QUICK should be Required** |
| Expected Timeline | Optional | Optional | Required | **Issue — QUICK/STRUCTURED should be Required** |
| Review Duration | Hidden | Optional | Required | Correct |
| Phase Notes | Hidden | Optional | Optional | Correct |
| Phase Durations | Optional | Required | Required | Correct |
| Complexity Notes | Optional | Optional | Optional | Correct |
| Complexity Params | Hidden | Required | Required | Correct |

### Tab/Step 5 — Provider Eligibility

| Field | QUICK | STRUCTURED | CONTROLLED | BA Assessment |
|-------|-------|------------|------------|---------------|
| Participation Modes | Optional | Required | Required | Correct |
| Solver Eligibility | Optional | Optional | Required | Correct |
| Solver Eligibility IDs | Optional | Required | Required | Correct |
| Challenge Visibility | Required | Required | Required | Correct |
| Challenge Enrollment | Required | Required | Required | Correct |
| Challenge Submission | Required | Required | Required | Correct |
| Required Expertise Level | Hidden | Optional | Required | Correct |
| Required Proficiencies | Hidden | Optional | Required | Correct |
| Required Sub-Domains | Hidden | Optional | Required | Correct |
| Required Specialities | Hidden | Optional | Required | Correct |
| Eligibility Text | Required | Required | Required | Correct |
| Permitted Artifact Types | Optional | Required | Required | Correct |
| Targeting Filters | Hidden | Optional | Required | Correct |

---

## Issues Found (6 items)

### 1. Expected Outcomes — STRUCTURED is Optional, should be Required
**Impact**: High. Project memory states "Expected Outcomes is mandatory across all governance modes." The QUICK mode was already fixed in the last migration, but STRUCTURED was missed.
**Fix**: Migration to update `expected_outcomes` for STRUCTURED from `optional` → `required`.

### 2. Gold Award — QUICK should be Optional, not Required
**Impact**: Medium. In QUICK mode, the Creator sets a single prize (Platinum). Forcing Gold creates friction and confusion — a quick challenge shouldn't require a tiered prize structure.
**Fix**: Migration to update `gold_award` for QUICK from `required` → `optional`.

### 3. Rejection Fee % — QUICK should be Auto (10%), not Required
**Impact**: Medium. QUICK mode creators shouldn't need to understand rejection fee mechanics. The platform should auto-assign the default 10% and hide this from the form, similar to how IP Model works.
**Fix**: Migration to update `rejection_fee_pct` for QUICK from `required` → `auto`. Ensure `default_value` is set to `'10'`.

### 4. Submission Deadline — QUICK should be Required, not Optional
**Impact**: High. Every challenge needs a deadline. Without it, solvers have no urgency and the platform cannot manage lifecycle phases. Making this optional in QUICK mode is a business risk.
**Fix**: Migration to update `submission_deadline` for QUICK from `optional` → `required`.

### 5. Expected Timeline — QUICK and STRUCTURED should be Required
**Impact**: Medium. Timeline expectation is critical for solver decision-making. "How long will this take?" is one of the first questions a solver asks. Leaving it optional means many challenges ship without this, degrading solver experience.
**Fix**: Migration to update `expected_timeline` for QUICK from `optional` → `required` and for STRUCTURED from `optional` → `required`.

### 6. useFormCompletion is out of sync with DB rules
**Impact**: Low (cosmetic). The `getRequiredFieldsByStep()` function in `useFormCompletion.ts` hardcodes required fields per mode. These don't match the DB rules (e.g., it lists `expected_timeline` as required for QUICK but the DB says optional). This file should be refactored to derive required fields from the `FieldRulesMap` instead of hardcoding.
**Fix**: Refactor `useFormCompletion.ts` to consume `FieldRulesMap` and compute completion dynamically.

---

## Recommended Changes

### Migration (DB)
Update `md_governance_field_rules`:
- `expected_outcomes` / STRUCTURED: `optional` → `required`
- `gold_award` / QUICK: `required` → `optional`
- `rejection_fee_pct` / QUICK: `required` → `auto`, set `default_value = '10'`
- `submission_deadline` / QUICK: `optional` → `required`
- `expected_timeline` / QUICK: `optional` → `required`
- `expected_timeline` / STRUCTURED: `optional` → `required`

### Code
- Refactor `useFormCompletion.ts` to derive required fields from `FieldRulesMap` instead of hardcoding per-mode arrays. This eliminates the drift between DB rules and UI completion tracking.

### Files Changed
| File | Change |
|------|--------|
| Migration | 6 field rule updates |
| `useFormCompletion.ts` | Refactor to use FieldRulesMap dynamically |

