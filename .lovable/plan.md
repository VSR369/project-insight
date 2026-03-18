

# Provider Eligibility & Matchmaking — Step 5 (Revised)

## Key Insight: Solver Categories from Database

The `md_solver_eligibility` table contains **12 solver categories** across two model types:

**Legacy categories** (display_order 10-80):
- Certified Basic (min ⭐), Certified Competent (min ⭐⭐), Certified Expert (min ⭐⭐⭐)
- Registered, Expert (Invitee), Signed In, Open Community, Hybrid

**BRD 5.7.1 categories** (display_order 100-140):
- Curated Expert (CE), Invitation Only (IO), Direct Registration (DR), Organization-Curated (OC), Open Enrollment (OE)

Each category has `default_visibility`, `default_enrollment`, `default_submission` — meaning selecting a solver category auto-configures the 3-tier publication model.

## What Changes

### 1. Replace Hardcoded Solver Eligibility with Database-Driven Selector

Current: 3 hardcoded checkboxes (Individual, Organization, Solution Cluster)
New: Radio-card selector loading from `md_solver_eligibility` via `useSolverEligibility()` hook, grouped by `model_category`. Selecting a category auto-populates visibility/enrollment/submission defaults from the record.

### 2. Schema Changes (`challengeFormSchema.ts`)

- Replace `solver_eligibility_types` with `solver_eligibility_id: z.string().min(1, 'Select a solver category')`
- Add `required_expertise_level_id`, `required_proficiencies`, `required_sub_domains`, `required_specialities` (all optional arrays/strings)
- Keep `challenge_visibility`, `challenge_enrollment`, `challenge_submission` but auto-fill from selected category's defaults

### 3. StepProviderEligibility.tsx — Full Rewrite

**Section 1: Challenge Visibility & Solver Category** (the user's "who can view it")
- Top-level radio: "All Solvers" vs "Selected Category of Solvers"
- If "All": sets `solver_eligibility_id` to Open Community/Open Enrollment
- If "Selected Category": shows grouped radio cards loaded from `md_solver_eligibility`
  - Each card: label, description, star badge (if certified), auth/certification requirements shown as tags
  - Selecting a category auto-fills visibility/enrollment/submission from the record's defaults
- Enterprise: shows editable 3-tier Publication Config below (auto-filled but overridable)
- Lightweight: auto-configures from selection, not editable

**Section 2: Solution Provider Eligibility Criteria** (from reference images 379/380)
- Read-only Industry Segment from Step 1 ("From Challenge Brief" badge)
- Read-only Experience Countries from Step 1
- Required Expertise Level dropdown
- Required Proficiencies — text chip input
- Sub-Domains — 2-column checkbox grid
- Specialities — text chip input

**Section 3: IP Model** (existing, keep as-is)

**Section 4: Permitted Artifact Types** (existing, keep as-is)

**Section 5: Targeting Filters** (Enterprise only, moved from StepTimeline)

### 4. StepTimeline.tsx — Remove Publication Config & Targeting Filters

Remove Sections 4 and 5. Keep: Overall Timeline, Phase Schedule, Gantt View, Complexity Assessment.

### 5. ChallengeWizardPage.tsx

- Update `getStepFields` step 5: add `solver_eligibility_id` and new eligibility fields, remove from step 4
- Update `buildFieldsFromForm`: serialize `solver_eligibility_id` and new fields

## Files to Modify

| File | Action |
|------|--------|
| `challengeFormSchema.ts` | Replace `solver_eligibility_types` with `solver_eligibility_id` + add 4 new fields |
| `StepProviderEligibility.tsx` | Full rewrite with 5 sections, database-driven category selector |
| `StepTimeline.tsx` | Remove publication config + targeting filters sections |
| `ChallengeWizardPage.tsx` | Update field mappings and serialization |
| `StepReviewSubmit.tsx` | Update review display for new solver eligibility field |

