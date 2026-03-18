

# Corrected Governance Configuration Matrix

Below is the complete field-by-field mapping cross-referenced between your Excel (v2) and the **actual current code**. I have flagged every discrepancy.

## Legend
- **R** = Required | **O** = Optional (visible) | **H** = Hidden | **A** = Auto-filled
- **Status**: Whether the field exists in both schema and UI code today

---

## STEP 0 — Mode & Strategy

| # | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|---|-----------|-----------|----------------|-------|---------|-------|--------|
| 1 | Governance Mode | `governance_profile` | Not in wizard UI (set at org level) | R | R | R | Schema: YES, UI: NO — needs Step 0 UI |
| 2 | Engagement Model | `operating_model` | Not in wizard UI (set at org level) | A | A | A | Schema: YES, UI: NO — auto from org |
| 3 | Governance Add-ons | `governance_addons` | NOWHERE | H | O | R | Schema: NO, UI: NO — **new field needed** |

---

## STEP 1 — Challenge Brief (StepProblem.tsx)

| # | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|---|-----------|-----------|----------------|-------|---------|-------|--------|
| 4 | Challenge Title | `title` | Step 1 | R | R | R | ACTIVE |
| 5 | The Hook | `hook` | NOWHERE | R | R | R | **NOT IN SCHEMA OR UI — new field needed** |
| 6 | Industry Segment | `industry_segment_id` | Step 1 (Select from master data) | H | O | O | ACTIVE (just fixed to use master data) |
| 7 | Experience Countries | `experience_countries` | Step 1 (multi-select from master data) | H | O | O | ACTIVE (just fixed to use master data) |
| 8 | Context & Background | `context_background` | Step 1 | H | O | O | ACTIVE |
| 9 | Problem Statement | `problem_statement` | Step 1 | R | R | R | ACTIVE |
| 10 | Detailed Description | `detailed_description` | Step 1 | H | O | O | ACTIVE |
| 11 | Root Causes | `root_causes` | Step 1 | H | O | O | ACTIVE |
| 12 | Scope Definition | `scope` | Step 1 | H | O | R | ACTIVE |
| 13 | Deliverables | `deliverables_list` | Step 1 | R | R | R | ACTIVE |
| 14 | Affected Stakeholders | `affected_stakeholders` | Step 1 | H | O | O | ACTIVE |
| 15 | Current Deficiencies | `current_deficiencies` | Step 1 | H | O | O | ACTIVE |
| 16 | Expected Outcomes | `expected_outcomes` | Step 1 | H | O | O | ACTIVE |
| 17 | Preferred Approach | `preferred_approach` | Step 1 | H | O | O | ACTIVE |
| 18 | Approaches NOT of Interest | `approaches_not_of_interest` | Step 1 | H | O | O | ACTIVE |
| 19 | Submission Guidelines | `submission_guidelines` | Step 1 | H | O | R | ACTIVE |
| 20 | Domain Tags | `domain_tags` | Step 1 (with custom entry) | R | R | R | ACTIVE (just added custom tag entry) |
| 21 | Taxonomy Tags | `taxonomy_tags` | NOWHERE | H | O | R | **ORPHAN — schema exists, NO UI** |
| 22 | Maturity Level | `maturity_level` | Step 1 | R | R | R | ACTIVE |
| 23 | Challenge Description | `description` | NOWHERE | R | R | R | **ORPHAN — schema exists, NO UI** |

**Step 1 issues to fix:**
- Row 5 (`hook`): Add to schema + Step 1 UI after Title
- Row 21 (`taxonomy_tags`): Add UI input in Step 1 near Domain Tags
- Row 23 (`description`): Add UI input in Step 1 as short summary textarea

---

## STEP 2 — Evaluation Criteria (StepEvaluation.tsx)

Excel places Artifact Types (#28) here. Code has them in Step 5.

| # | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|---|-----------|-----------|----------------|-------|---------|-------|--------|
| 24 | Criteria Names | `weighted_criteria[].name` | Step 2 | R | R | R | ACTIVE |
| 25 | Criteria Weights | `weighted_criteria[].weight` | Step 2 (now editable in all modes) | A | R | R | ACTIVE (just fixed) |
| 26 | Criteria Descriptions | `weighted_criteria[].description` | Step 2 | H | O | O | ACTIVE |
| 27 | Scoring Rubrics | `weighted_criteria[].rubrics` | Step 2 | H | O | R | ACTIVE |
| 28 | Artifact Types | `permitted_artifact_types` | **Step 5** (not Step 2) | A | O | R | ACTIVE but **in wrong tab vs Excel** |

**Step 2 decision needed:** Should Artifact Types move from Step 5 to Step 2 (matching Excel), or keep in Step 5 (matching current code)?

---

## STEP 3 — Value Exchange / Rewards (StepRewards.tsx)

Excel places IP Model (#41) and IP Suggestion (#42) here. Code has IP Model in Step 5.

| # | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|---|-----------|-----------|----------------|-------|---------|-------|--------|
| 29 | Reward Type | `reward_type` | Step 3 | R | R | R | ACTIVE |
| 30 | Reward Description | `reward_description` | Step 3 | O | O | O | ACTIVE |
| 31 | Num Rewarded Solutions | `num_rewarded_solutions` | Step 3 | R | R | R | ACTIVE |
| 32 | Currency | `currency_code` | Step 3 | R | R | R | ACTIVE |
| 33 | Platinum Award | `platinum_award` | Step 3 | R | R | R | ACTIVE |
| 34 | Gold Award | `gold_award` | Step 3 | O | O | O | ACTIVE |
| 35 | Silver Award | `silver_award` | Step 3 | O | O | O | ACTIVE |
| 36 | Effort Level | `effort_level` | NOWHERE | R | R | R | **NOT IN SCHEMA OR UI — new field needed** |
| 37 | Reward Guidance | `reward_guidance` | NOWHERE | A | A | A | **Display-only computed — no schema needed** |
| 38 | Payment Mode | `payment_mode` | Step 3 | A | O | R | ACTIVE |
| 39 | Payment Milestones | `payment_milestones` | Step 3 | H | O | R | ACTIVE |
| 40 | Rejection Fee % | `rejection_fee_pct` | Step 3 | H | O | R | ACTIVE |
| 41 | IP Model | `ip_model` | **Step 5** (not Step 3) | R | R | R | ACTIVE but **in wrong tab vs Excel** |
| 42 | IP Suggestion | `ip_suggestion` | NOWHERE | A | A | A | **Display-only computed — no schema needed** |

**Step 3 decision needed:** Should IP Model move from Step 5 to Step 3 (matching Excel), or keep in Step 5?

---

## STEP 4 — Timeline & Phases (StepTimeline.tsx)

| # | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|---|-----------|-----------|----------------|-------|---------|-------|--------|
| 43 | Submission Deadline | `submission_deadline` | Step 4 | R | R | R | ACTIVE |
| 44 | Phase Durations | `phase_durations` | Step 4 | O | O | R | ACTIVE |
| 45 | Complexity Assessment | `complexity_notes` | Step 4 (dual UI: dropdown vs sliders) | R | R | R | ACTIVE |
| 46 | Review Duration | `review_duration` | Step 4 schema only | A | R | R | **ORPHAN — schema exists, NO UI in Step 4** |
| 47 | Expected Timeline | `expected_timeline` | Step 4 schema only | O | O | O | **ORPHAN — schema exists, NO UI in Step 4** |
| 48 | Phase Notes | `phase_notes` | Step 4 schema only | H | O | O | **ORPHAN — schema exists, NO UI in Step 4** |

**Step 4 missing from Excel but in code:**

| -- | Complexity Params (7 sliders) | `complexity_params` | Step 4 (Controlled mode only) | H | H | R | ACTIVE but **missing from Excel** |

---

## STEP 5 — Provider Eligibility (StepProviderEligibility.tsx)

| # | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|---|-----------|-----------|----------------|-------|---------|-------|--------|
| 49 | Participation Modes | `eligible_participation_modes` | Step 5 (checkboxes, always visible) | H | O | O | ACTIVE (just fixed) |
| 50 | Solver Tier | `solver_eligibility_ids` | Step 5 (checkboxes now) | H | O | O | ACTIVE (just changed to checkboxes) |
| 51 | Challenge Visibility | `challenge_visibility` | Step 5 | R | R | R | ACTIVE |
| 52 | Challenge Enrollment | `challenge_enrollment` | Step 5 | A | R | R | ACTIVE |
| 53 | Challenge Submission | `challenge_submission` | Step 5 | A | R | R | ACTIVE |
| 54 | Required Expertise | `required_expertise_level_id` | Step 5 (cleaned, master data) | H | O | O | ACTIVE (just cleaned SMOKE_TEST) |
| 55 | Eligibility (Text) | `eligibility` | NOWHERE | H | O | R | **ORPHAN — schema exists, NO UI** |
| 56 | Submission Template | `submission_template_url` | **Step 6** (not Step 5) | O | O | O | ACTIVE but **in wrong tab vs Excel** |

**Step 5 missing from Excel but in code:**

| -- | Required Proficiencies | `required_proficiencies` | Step 5 (multi-select from master data) | H | O | O | ACTIVE but **missing from Excel** |
| -- | Required Sub-Domains | `required_sub_domains` | Step 5 (multi-select from master data) | H | O | O | ACTIVE but **missing from Excel** |
| -- | Required Specialities | `required_specialities` | Step 5 (multi-select from master data) | H | O | O | ACTIVE but **missing from Excel** |
| -- | Targeting Filters | `targeting_filters` | Step 5 (Controlled only) | H | H | O | ACTIVE but **missing from Excel** |

---

## STEP 6 — Solution Templates (StepTemplates.tsx)

Not in the Excel at all as a separate step. Excel places `submission_template_url` (#56) in Step 5.

| -- | Parameter | Schema Key | Actual Code Tab | Quick | Struct. | Cont. | Status |
|----|-----------|-----------|----------------|-------|---------|-------|--------|
| -- | Solution Category Description | `solution_category_description` | Step 6 | O | O | O | ACTIVE (just added) |
| -- | Solution Template Upload | `submission_template_url` | Step 6 | O | O | O | ACTIVE |
| -- | Legal Document Uploads | (local state, not schema) | Step 6 | O | O | R | ACTIVE (just added) |

---

## STEP 7 — Review & Submit (StepReviewSubmit.tsx)

No form fields. Shows all values from Steps 1-6 with Edit buttons. **Just rebuilt** to show all parameters dynamically.

---

## Summary of Discrepancies

### Fields in Excel but NOT in code (need to be created):

| # | Field | Schema Key | Action |
|---|-------|-----------|--------|
| 3 | Governance Add-ons | `governance_addons` | Add to schema + DB + Step 0 UI |
| 5 | The Hook | `hook` | Add to schema + DB + Step 1 UI |
| 36 | Effort Level | `effort_level` | Add to schema + DB + Step 3 UI |
| 37 | Reward Guidance | `reward_guidance` | Computed display only — helper function |
| 42 | IP Suggestion | `ip_suggestion` | Computed display only — helper function |

### Fields in code but NOT in Excel (need to be added to matrix):

| Field | Schema Key | Code Tab | Proposed | Quick | Struct. | Cont. |
|-------|-----------|----------|----------|-------|---------|-------|
| Required Proficiencies | `required_proficiencies` | Step 5 | Row 54b | H | O | O |
| Required Sub-Domains | `required_sub_domains` | Step 5 | Row 54c | H | O | O |
| Required Specialities | `required_specialities` | Step 5 | Row 54d | H | O | O |
| Targeting Filters | `targeting_filters` | Step 5 | Row 54e | H | H | O |
| Complexity Params (sliders) | `complexity_params` | Step 4 | Row 45b | H | H | R |
| Solution Category Desc | `solution_category_description` | Step 6 | Row 56b | O | O | O |

### Fields in wrong tab (Excel says X, code says Y):

| # | Field | Excel Tab | Code Tab | Recommendation |
|---|-------|-----------|----------|----------------|
| 28 | Artifact Types | Step 2 | Step 5 | Keep in Step 5 (logically grouped with eligibility) |
| 41 | IP Model | Step 3 | Step 5 | Move to Step 3 (logically grouped with value exchange) |
| 56 | Submission Template | Step 5 | Step 6 | Keep in Step 6 (dedicated templates tab) |

### Orphaned fields (schema exists, no UI):

| # | Field | Schema Key | Fix |
|---|-------|-----------|-----|
| 21 | Taxonomy Tags | `taxonomy_tags` | Add input to Step 1 |
| 23 | Challenge Description | `description` | Add textarea to Step 1 |
| 46 | Review Duration | `review_duration` | Add input to Step 4 |
| 47 | Expected Timeline | `expected_timeline` | Add input to Step 4 |
| 48 | Phase Notes | `phase_notes` | Add textarea to Step 4 |
| 55 | Eligibility (Text) | `eligibility` | Add textarea to Step 5 |

### Legacy field to deprecate:

| Field | Schema Key | Reason |
|-------|-----------|--------|
| Visibility (old) | `visibility` | Replaced by `challenge_visibility` — remove from schema |

---

## Proposed Corrected Final Matrix (65 rows)

Once you confirm the 3 tab-placement decisions above, I will implement:

1. Add 3 new schema fields (`hook`, `effort_level`, `governance_addons`)
2. Add 6 orphaned fields to their respective step UIs
3. Add 6 missing fields to the governance config
4. Move IP Model from Step 5 to Step 3 (if approved)
5. Remove deprecated `visibility` field
6. Build 2 computed display helpers (`reward_guidance`, `ip_suggestion`)

Total fields after corrections: **57 schema keys** + **2 display-only helpers** = **59 governance config rows** across 7 steps (+ Step 0).

