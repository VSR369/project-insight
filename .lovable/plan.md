

# Phase 4 Gap Analysis

## Status Summary

| Checklist Item | Status |
|---|---|
| `buildChallengeContext()` returns complete object with all 24 sections | Done |
| `todaysDate` is fresh `new Date()` on every call | Done |
| Rate card looked up correctly (org type x maturity) | Done |
| Master data loaded (domain tags, maturity, complexity, etc.) | Done |
| Validation: past dates in Phase Schedule -> auto-corrects | Done |
| Validation: non-sequential phases -> auto-corrects | Done |
| Validation: non-master-data values -> flags with closest match | Done |
| Validation: evaluation weights != 100% -> auto-normalizes | Done |
| Validation: reward below rate floor -> warns | Done |
| Validation: prize tiers > total pool -> errors | Done |
| Validation results display as info bar below AI output | Done |
| Store supports `setValidationResult` | Done |
| `useAiSectionReview` calls validator after AI response | Done |
| `useComplexityDimensions` hook created | Done |
| DB migration: `complexity_dimensions` table + seed data | Done |
| DB migration: `solution_type` column on `challenges` | Done |
| **AI calls receive full context JSON in system prompt** | **NOT DONE** |
| **ComplexityAssessmentModule uses solution-type dimensions** | **NOT DONE** |
| **Edge function updated to use richer context** | **NOT DONE** |
| **CurationReviewPage passes solutionType to complexity module** | **NOT DONE** |
| **Changing solution type reloads dimensions with reset warning** | **NOT DONE** |

## 3 Remaining Gaps

### Gap 1: ComplexityAssessmentModule — solution-type dimension integration

`ComplexityAssessmentModule.tsx` has zero references to `solutionType`, `solution_type`, or `useComplexityDimensions`. It still uses only the generic `complexityParams` from `master_complexity_params`. This is the largest gap.

**Fix:**
- Add `solutionType` prop to `ComplexityAssessmentModuleProps`
- Call `useComplexityDimensions(solutionType)` inside the component
- When solution-type dimensions are available, override the generic `complexityParams` labels and descriptions with the dimension-specific `dimension_name`, `level_1_description`, `level_3_description`, `level_5_description`
- Map the 1-5 dimension scale to the existing 1-10 slider scale (multiply by 2)
- Add a `useEffect` that detects `solutionType` change: if scores exist and type changes, show a confirmation dialog to reset scores
- Keep the same 3-tab UI, same computation, same lock mechanism

### Gap 2: CurationReviewPage — pass solutionType to ComplexityAssessmentModule

The curation page does not read `solution_type` from the challenge data or pass it to the complexity module.

**Fix:**
- Read `solution_type` from the challenge query data
- Pass it as `solutionType` prop to `ComplexityAssessmentModule`
- Also pass it to `buildChallengeContext` (already has the field in its options interface)

### Gap 3: Edge function — use enriched context

The `review-challenge-sections` edge function does not reference `todaysDate`, `rateCard`, or the full `ChallengeContext` object. The context is passed from the client but not injected into the system prompt.

**Fix:**
- In `review-challenge-sections/index.ts`, extract the `context` field from the request body
- Inject `todaysDate` and key context fields (maturity, complexity, rate card summary) into the system prompt template
- Pass `solution_type` to complexity-related prompts

## Files to Modify

| File | Change |
|---|---|
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Add `solutionType` prop, call `useComplexityDimensions`, overlay dimension labels, handle type change reset |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Read `solution_type` from challenge, pass to complexity module and context assembler |
| `supabase/functions/review-challenge-sections/index.ts` | Extract context from request body, inject into system prompt |

