

# Plan: Make AI Spec Review Match Manual Editor UX

## What's Wrong

1. **Deliverables** — AI generates them but they're just text strings. They should be clear actionable items (already rendered as numbered list — this is fine, but the AI prompt needs to be more specific about generating solution-oriented deliverables based on the problem statement).

2. **Evaluation Criteria** — The table structure exists but the AI sometimes generates unstructured criteria. Need to enforce the same Name/Weight/Description format as the Manual Editor's `StepEvaluation.tsx`.

3. **Access Model Summary (Solver Eligibility + Visibility/Enrollment/Submission)** — Currently read-only in the AI review. The user wants it **editable** with the same master-data-driven selectors as `StepProviderEligibility.tsx` (solver tier checkboxes, visibility/enrollment/submission dropdowns).

## Changes

### 1. Improve AI Prompt for Deliverables & Criteria
**File:** `supabase/functions/generate-challenge-spec/index.ts`

Update the system prompt guidelines:
- **Deliverables**: Add instruction to derive deliverables specifically from the problem statement and expected solution — each must be a concrete, measurable output (not generic). Add examples: "Working API prototype with documentation", "Cost-benefit analysis report".
- **Evaluation Criteria**: Reinforce that weights must sum to exactly 100, each criterion needs a clear name (2-4 words), specific weight, and a 1-2 sentence description explaining how it will be scored.

### 2. Make Solver Eligibility & Access Model Editable in AI Review
**File:** `src/pages/cogniblend/AISpecReviewPage.tsx`

Replace the read-only `SolverEligibilityDisplay` with an editable version:

- **Solver Tier Checkboxes**: Fetch `md_solver_eligibility` via `useSolverEligibility()` hook, render as checkbox cards (same layout as `StepProviderEligibility.tsx`). Pre-select the AI-recommended codes. User can check/uncheck.
- **Visibility/Enrollment/Submission Dropdowns**: Add the 3-column card grid with `Select` dropdowns (same as the Manual Editor's Publication Configuration). Auto-fill from selected solver tier's defaults, user can override. Import `VISIBILITY_OPTIONS`, `ENROLLMENT_OPTIONS`, `SUBMISSION_OPTIONS` from constants.
- **AccessModelSummary**: Keep the existing flow diagram below the dropdowns, now reflecting user selections.
- Wire local state for `solverEligibilityIds`, `visibility`, `enrollment`, `submission` — initialized from AI spec, editable by user.

### 3. Update the LLM Model Reference
**File:** `supabase/functions/generate-challenge-spec/index.ts`

Currently using `google/gemini-3-flash-preview` which is the correct default model. No change needed — but will confirm in the implementation.

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/generate-challenge-spec/index.ts` | Modify — improve deliverables/criteria prompt |
| `src/pages/cogniblend/AISpecReviewPage.tsx` | Modify — make solver eligibility & access model editable with master-data selectors |

## Technical Notes

- The `useSolverEligibility()` hook already exists and returns `md_solver_eligibility` data with `id`, `code`, `label`, `description`, `default_visibility`, etc.
- AI-selected codes need to be mapped to IDs (lookup by code) for the checkbox state.
- The `VALID_ENROLLMENTS` and `VALID_SUBMISSIONS` cascade logic from `StepProviderEligibility.tsx` will be reused to ensure dropdown options are consistent.
- The AI model used is `google/gemini-3-flash-preview` (Lovable AI Gateway default).

