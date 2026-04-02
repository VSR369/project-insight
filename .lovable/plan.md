

# Batch B Implementation Plan

You're right — let's proceed batch by batch. Here's the concrete plan for **Batch B** (the next set of 6 files in the 400-560 line range).

## Files to Decompose

| # | File | Current | Target | Extraction |
|---|------|:-------:|:------:|------------|
| 1 | `useCurationPageOrchestrator.ts` (560) | 560 | ~200 | Extract `useCurationEffects.ts` + `useCurationMutations.ts` |
| 2 | `OrgContextPanel.tsx` (519) | 519 | ~180 | Wire already-created `OrgFormFields.tsx` + `OrgAttachmentList.tsx` |
| 3 | `ComplexityAssessmentModule.tsx` (503) | 503 | ~180 | Extract `ComplexityRatingSliders.tsx` + `ComplexityResultCard.tsx` |
| 4 | `CurationActions.tsx` (496) | 496 | ~180 | Extract `ActionButtonGroup.tsx` |
| 5 | `CreatorChallengeDetailView.tsx` (478) | 478 | ~180 | Extract `CreatorTabContent.tsx` |
| 6 | `useCurationAcceptRefinement.ts` (433) | 433 | ~200 | Wire already-created `normalizeAIContent.ts` |

## Approach

1. Read each file to understand its structure
2. Identify extractable blocks (pure functions, sub-components, effect groups)
3. Create new focused files — MOVE code only, no logic changes
4. Update parent files to import and delegate
5. Verify TypeScript compilation after each file

## Safety Rules

- Move code only — no rewrites
- No interface changes
- Hook order preserved (useState → useQuery → useEffect → conditional returns)
- Files #2 and #6 already have extraction targets created — just need wiring

