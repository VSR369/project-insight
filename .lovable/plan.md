

# Verification Report: Fill Test Data Maturity Fix & My Challenges View

## Finding 1: Fill Test Data Maturity — CODE IS FIXED ✅

The code changes are correct:
- `handleFillTestData` (line 402-418) now looks up `solutionMaturityOptions` to match seed maturity codes to actual `md_solution_maturity` records
- Both `maturity_level` (the UI code like `SOLUTION_PROTOTYPE`) and `solution_maturity_id` (the UUID) are set
- The normalizer (`challengeFieldNormalizer.ts`) includes `DEMO` in `VALID_MATURITY`
- All three mutation paths (`useSubmitSolutionRequest`, `useSaveDraft`, `useUpdateDraft`) call `normalizeConstrainedChallengeFields` which strips `SOLUTION_` prefix before DB write

**However**: The current draft in the database (`bc92ae14...`) still has `maturity_level: NULL` and `solution_maturity_id: NULL`. This means you haven't used "Fill Test Data" since the fix was deployed, or the draft was created before the fix. You need to click "Fill Test Data" again on this draft to populate the maturity field.

## Finding 2: My Challenges "View" Empty Screen — CANNOT REPRODUCE YET

There are **zero submitted challenges** in the database. All 5 challenges are phase 1 drafts (4 soft-deleted, 1 active). The "View" button only appears for non-draft challenges (submitted, phase 2+). Since no challenge has been submitted yet, this issue cannot currently occur.

The "View" route (`/cogni/challenges/:id/view`) renders `PublicChallengeDetailPage`, which has a potential issue:

**Potential bug identified**: The `getMaturityLabel` function in `PublicChallengeDetailPage.tsx` (line 55-63) uses lowercase keys (`'blueprint'`, `'poc'`, `'prototype'`, `'pilot'`) but the DB stores UPPERCASE (`'BLUEPRINT'`, `'POC'`). There is a centralized `getMaturityLabel` in `maturityLabels.ts` that handles this with a `.toLowerCase()` fallback, but the inline function in the detail page does NOT. This won't cause an empty screen but would show raw uppercase codes instead of labels.

## Recommended Next Steps

1. **Test end-to-end**: Click "Fill Test Data" on the current draft, verify maturity radio is selected, then submit to curator
2. **Fix inline `getMaturityLabel`** in `PublicChallengeDetailPage.tsx` and `CreatorChallengeDetailView.tsx` — replace inline functions with the centralized import from `@/lib/maturityLabels`
3. After successful submission, verify the "View" button works on My Challenges page

## Changes Required

| File | Change |
|---|---|
| `src/pages/cogniblend/PublicChallengeDetailPage.tsx` | Replace inline `getMaturityLabel` with import from `@/lib/maturityLabels` |
| `src/components/cogniblend/challenges/CreatorChallengeDetailView.tsx` | Replace inline `getMaturityLabel` with import from `@/lib/maturityLabels` |

These are minor fixes. The main maturity normalization pipeline is already working correctly.

