

# Evaluation Criteria Enhancement Plan (Step 2)

## Reference Image Analysis

**Image 375** shows Step 2 "Evaluation Criteria" with:
- A table with columns: **#** (row number), **Criterion Name***, **Weight (%)***, **Description**, and a delete (trash) button
- 5 pre-filled criteria (Technical Approach & Innovation 30%, SAP Integration Feasibility 20%, Accuracy & Performance 25%, Implementation Plan 15%, Team Experience 10%)
- "Total Weight: 100% ✓" footer row
- "+ Add Criterion" button below

**Image 376** shows a **Scoring Rubrics** section below the criteria table:
- Each criterion appears as an expandable accordion card with left amber border
- When expanded, shows 5 score levels: **Score 1 — Poor**, **Score 2 — Below Average**, **Score 3 — Meets Expectations**, **Score 4 — Exceeds Expectations**, **Score 5 — Exceptional**
- Each level has a text input for the rubric description
- Footer: "Save as Draft" (red) + "Next: Rewards & Payment →" (blue)

## Gaps in Current Implementation

| # | Gap | Detail |
|---|-----|--------|
| 1 | No Description column | Current table only has Name + Weight (Enterprise) or Name (Lightweight) |
| 2 | No row numbers | Missing "#" column |
| 3 | No Scoring Rubrics section | Entire 5-level rubric system per criterion is missing |
| 4 | Bottom bar not contextual | Shows generic "Next" instead of "Next: Rewards & Payment →" |
| 5 | Rewards/Payment in wrong step | Step 3 currently renders `StepRequirements` (IP, artifacts, eligibility) — rewards should be Step 3 |

## Implementation

### 1. Schema Update (`challengeFormSchema.ts`)

Expand `weighted_criteria` array items to include `description` and `rubrics`:
```typescript
weighted_criteria: z.array(z.object({
  name: z.string().min(1).max(200),
  weight: z.number().min(0).max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  rubrics: z.object({
    score_1: z.string().max(500).optional().or(z.literal('')),
    score_2: z.string().max(500).optional().or(z.literal('')),
    score_3: z.string().max(500).optional().or(z.literal('')),
    score_4: z.string().max(500).optional().or(z.literal('')),
    score_5: z.string().max(500).optional().or(z.literal('')),
  }).optional(),
}))
```

Update `DEFAULT_FORM_VALUES` with 5 default criteria matching the reference (Technical Approach & Innovation, SAP Integration Feasibility, Accuracy & Performance, Implementation Plan, Team Experience) with descriptions and empty rubrics.

### 2. StepEvaluation.tsx — Major Rewrite

**Evaluation Criteria table (Enterprise mode):**
- 4-column grid: `#` | `Criterion Name *` | `Weight (%) *` | `Description` | trash icon
- Row numbers auto-increment
- Description column: text input for each criterion
- "Total Weight:" footer with `100% ✓` or error state
- "+ Add Criterion" button

**Scoring Rubrics section (below criteria table):**
- Section header: "Scoring Rubrics" with subtitle "Define what constitutes each score level (1–5) for each criterion."
- Each criterion rendered as a collapsible accordion card:
  - Left amber/orange border
  - Header: criterion name (bold) + description (muted)
  - Chevron toggle (expand/collapse)
  - When expanded: 5 labeled text inputs for Score 1–5 with level names (Poor, Below Average, Meets Expectations, Exceeds Expectations, Exceptional)
- Only criteria with names are shown in rubrics

**Lightweight mode:** Keep simple checklist (no weight column, no rubrics — auto-distributed weights).

### 3. Remove Rewards from StepEvaluation

The current `StepEvaluation` includes rewards (Platinum/Gold/Silver) and rejection fee. Per the 7-step restructure, rewards belong in **Step 3**. Move the entire rewards section out of `StepEvaluation.tsx`. Step 3 currently renders `StepRequirements` — swap so:
- Step 2 = `StepEvaluation` (criteria + rubrics only)
- Step 3 = New `StepRewards` component (rewards + rejection fee, extracted from current StepEvaluation)

### 4. StepRewards.tsx (New Component)

Extract from current StepEvaluation:
- Reward type toggle (monetary/non-monetary) for Lightweight
- Currency selector + Platinum/Gold/Silver tiers for Enterprise
- Rejection fee slider (Enterprise only)
- All existing logic preserved, just moved to its own component

### 5. ChallengeWizardPage.tsx — Step Mapping Fix

Update step rendering:
- Step 2 → `StepEvaluation` (criteria + rubrics only)
- Step 3 → `StepRewards` (new, rewards + rejection fee)
- Step 4 → `StepRequirements` (IP, artifacts, solver eligibility — was step 3)
- Step 5 → `StepTimeline` (was step 4)
- Step 6 → `StepProviderEligibility` (was step 5)
- Step 7 → `StepTemplates` (was step 6)

Wait — the progress bar already says: Challenge Brief → Evaluation → Rewards → Timeline → Eligibility → Templates → Review. So the correct mapping should be:
- Step 3 = Rewards & Payment
- Step 4 = Timeline & Phase Schedule
- Step 5 = Provider Eligibility
- Step 6 = Templates
- Step 7 = Review & Submit

Currently step 3 renders `StepRequirements` and step 4 renders `StepTimeline`. The fix is to insert `StepRewards` at step 3 and push Requirements into a later step or merge it.

Actually looking at the 7-step labels: there's no "Requirements" step. The content from StepRequirements (IP model, artifact types, solver eligibility) should move into **Step 5 (Provider Eligibility)** or **Step 1 (Challenge Brief)** where some already exist. I'll merge StepRequirements fields into StepProviderEligibility since they're about solver/provider constraints.

Updated rendering:
```
Step 1: StepProblem (Challenge Brief)
Step 2: StepEvaluation (Criteria + Rubrics — no rewards)
Step 3: StepRewards (new — rewards, rejection fee)
Step 4: StepTimeline (unchanged)
Step 5: StepProviderEligibility (merge in IP model, artifact types, solver eligibility from StepRequirements)
Step 6: StepTemplates (unchanged)
Step 7: StepReviewSubmit (unchanged)
```

Update `getStepFields()` accordingly.

### 6. ChallengeWizardBottomBar.tsx — Contextual Labels

Add step-aware next button labels:
```
Step 1: "Continue to Evaluation Criteria →"
Step 2: "Next: Rewards & Payment →"
Step 3: "Next: Timeline & Phase Schedule →"
...etc
Step 7: "Submit for [Legal Review / Curation]"
```

Also add "← Back to Challenge Brief" style back labels.

### 7. ChallengeProgressBar.tsx — Update Labels

Update step labels to match reference exactly:
```
Evaluation Criteria (not just "Evaluation")
Rewards & Payment (not just "Rewards")
Timeline & Phase Schedule (not just "Timeline")
Provider Eligibility (not just "Eligibility")
Review & Submit (not just "Review")
```

## Files to Modify/Create

| File | Action |
|------|--------|
| `challengeFormSchema.ts` | Add `description` and `rubrics` to criteria schema + update defaults |
| `StepEvaluation.tsx` | Rewrite: 4-column table + scoring rubrics accordion, remove rewards |
| `StepRewards.tsx` | **New**: Extract rewards + rejection fee from StepEvaluation |
| `StepProviderEligibility.tsx` | Merge in fields from StepRequirements (IP, artifacts, solver eligibility) |
| `ChallengeWizardPage.tsx` | Fix step→component mapping, update `getStepFields()` |
| `ChallengeWizardBottomBar.tsx` | Add contextual step labels for Next/Back |
| `ChallengeProgressBar.tsx` | Update step label text |

## Safety

- All existing form data and validation logic preserved
- No database changes — rubrics stored in existing `evaluation_criteria` JSONB
- `buildFieldsFromForm` already serializes `weighted_criteria` into `evaluation_criteria.criteria` — just needs to include new `description` and `rubrics` fields
- Lightweight mode behavior unchanged (auto-distributed weights, no rubrics)

