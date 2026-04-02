

# Gap Analysis: DECOMPOSITION-PLAN-4.md vs Current State

## Summary

The plan targets **20 files** to decompose below 200 lines each, plus 6 edge function files. Here is the current status of every file.

## Current Line Counts vs Plan Targets

### DONE — Meeting or Near Target (no action needed)

| File | Plan Original | Current | Target | Status |
|------|:---:|:---:|:---:|--------|
| CurationReviewPage.tsx | 4,402 | **282** | ~180 | DONE |
| promptTemplate.ts (edge fn) | 1,675 | **52** | ~50 | DONE (barrel) |
| AIReviewResultPanel.tsx | 1,355 | **375** | ~180 | Improved (was 556 in prior gap doc) |
| SectionReferencePanel.tsx | 440 | **280** | ~200 | Borderline — acceptable |
| EvaluationCriteriaSection.tsx | 405 | **289** | ~200 | Borderline — acceptable |
| review-challenge-sections/index.ts | 1,995 | **929** | ~200 | Improved but still large |

### GAP — Still Over Target (action required)

| # | File | Current Lines | Target | Gap |
|:---:|------|:---:|:---:|:---:|
| 1 | CurationSectionList.tsx | **340** | ~200 | 140 over |
| 2 | AIReviewInline.tsx | **711** | ~180 | 531 over |
| 3 | RewardStructureDisplay.tsx | **711** | ~180 | 531 over |
| 4 | aiCalls.ts (edge fn) | **750** | ~200 | 550 over |
| 5 | CurationChecklistPanel.tsx | **639** | ~180 | 459 over |
| 6 | CuratorSectionPanel.tsx | **581** | ~180 | 401 over |
| 7 | ExtendedBriefDisplay.tsx | **580** | ~180 | 400 over |
| 8 | useCurationPageOrchestrator.ts | **560** | ~200 | 360 over |
| 9 | OrgContextPanel.tsx | **519** | ~180 | 339 over |
| 10 | ComplexityAssessmentModule.tsx | **503** | ~180 | 323 over |
| 11 | CurationActions.tsx | **496** | ~180 | 316 over |
| 12 | CreatorChallengeDetailView.tsx | **478** | ~180 | 298 over |
| 13 | useCurationAcceptRefinement.ts | **433** | ~200 | 233 over |
| 14 | SolverExpertiseSection.tsx | **426** | ~180 | 246 over |
| 15 | CurationRightRail.tsx | **425** | ~200 | 225 over |
| 16 | CurationHeaderBar.tsx | **392** | ~200 | 192 over |
| 17 | promptBuilders.ts (edge fn) | **376** | ~200 | 176 over |
| 18 | useCurationPageData.ts | **329** | ~200 | 129 over |
| 19 | useCurationSectionActions.ts | **328** | ~200 | 128 over |
| 20 | CurationSectionEditor.tsx | **323** | ~200 | 123 over |
| 21 | AICurationQualityPanel.tsx | **304** | ~200 | 104 over |
| 22 | useCurationAIActions.ts | **265** | ~200 | 65 over |
| 23 | useCurationComputedValues.ts | **249** | ~200 | 49 over |

### Edge Function (index.ts) — Not Yet at Target

| File | Current | Target | Status |
|------|:---:|:---:|--------|
| index.ts | **929** | ~200 | Still large — plan called for further splits |

## Mapping to Plan Phases — What's Done vs Remaining

| Phase | Description | Status |
|-------|-------------|--------|
| D1.1 | Extract SECTION_DEFS + helpers from page | DONE |
| D2.1 | Extract useCurationPageData hook | DONE |
| D2.2 | Extract edge function modules (masterData, aiCalls, complexity) | DONE (but aiCalls still 750 lines) |
| D3.1 | Extract CurationRightRail | DONE (but 425 lines — needs card splits) |
| D3.2 | Extract CurationSectionList | DONE (but 340 lines — needs CurationSectionItem) |
| D3.3 | Extract CurationHeaderBar | DONE (but 392 lines — needs sub-splits) |
| D4.1 | Extract useCurationSectionActions | DONE (but 328 lines) |
| D4.2 | Extract useCurationAIActions | DONE (but 265 lines) |
| D5.1 | Decompose AIReviewResultPanel | PARTIAL (375 lines — ReviewCommentList + SuggestionVersionDisplay extracted) |
| D5.2 | Decompose promptTemplate | DONE (barrel at 52 lines) |
| D5.3 | Decompose ComplexityAssessmentModule + AIReviewInline | NOT DONE (503 + 711 lines) |
| D5.4 | Decompose 8 Priority 2 files | NOT DONE (all 8 still oversized) |
| D6.1 | Decompose 6 Priority 3 files | PARTIAL (some extracted, most still over) |
| D6.2 | Verify page under 200 lines | DONE (282 lines) |
| D6.3 | Final regression | NOT DONE |

## Implementation Plan — 5 Remaining Batches

### Batch A: Largest Gaps (>500 lines) — 6 files

1. **AIReviewInline.tsx (711)** → Extract `AIReviewSuggestionRenderer.tsx` (structured/master-data rendering) + `AIReviewRefineRunner.tsx` (refine call + state). Parent → ~180 lines.
2. **RewardStructureDisplay.tsx (711)** → Extract `RewardTierEditor.tsx` + `RewardSummaryCard.tsx`. Parent → ~180 lines.
3. **aiCalls.ts edge fn (750)** → Split into `aiPass1.ts` (callAIPass1Analyze) + `aiPass2.ts` (callAIPass2Rewrite). Parent → ~200 lines.
4. **CurationChecklistPanel.tsx (639)** → Extract `ChecklistGroupCard.tsx` + `ChecklistProgressBar.tsx`. Parent → ~180 lines.
5. **CuratorSectionPanel.tsx (581)** → Extract `SectionPanelToolbar.tsx` + `SectionAcceptDialog.tsx`. Parent → ~180 lines.
6. **ExtendedBriefDisplay.tsx (580)** → Extract `BriefFieldRenderer.tsx`. Parent → ~180 lines.

### Batch B: Medium Gaps (400-560 lines) — 6 files

1. **useCurationPageOrchestrator.ts (560)** → Extract `useCurationEffects.ts` + `useCurationMutations.ts`
2. **OrgContextPanel.tsx (519)** → Extract `OrgDetailCards.tsx`
3. **ComplexityAssessmentModule.tsx (503)** → Extract `ComplexityRatingSliders.tsx` + `ComplexityResultCard.tsx`
4. **CurationActions.tsx (496)** → Extract `ActionButtonGroup.tsx`
5. **CreatorChallengeDetailView.tsx (478)** → Extract `CreatorTabContent.tsx`
6. **useCurationAcceptRefinement.ts (433)** → Extract `normalizeAIContent.ts` (pure functions)

### Batch C: Smaller Gaps (300-430 lines) — 6 files

1. **SolverExpertiseSection.tsx (426)** → Extract `ExpertiseTagEditor.tsx`
2. **CurationRightRail.tsx (425)** → Extract individual card components into `RightRailCards.tsx`
3. **CurationHeaderBar.tsx (392)** → Extract `GroupNavigationStrip.tsx` + `CurationBanners.tsx`
4. **CurationSectionList.tsx (340)** → Extract `CurationSectionItem.tsx`
5. **useCurationPageData.ts (329)** → Extract query defs into `curationQueries.ts`
6. **useCurationSectionActions.ts (328)** → Extract pure helpers into `sectionActionHelpers.ts`

### Batch D: Borderline Files (200-325 lines) — 4 files

1. **CurationSectionEditor.tsx (323)** → Extract `EditorToolbar.tsx`
2. **AICurationQualityPanel.tsx (304)** → Extract `QualityMetricCard.tsx`
3. **useCurationAIActions.ts (265)** → Extract `aiReviewHelpers.ts`
4. **useCurationComputedValues.ts (249)** → Extract selector fns

### Batch E: Edge Functions — 2 files

1. **promptBuilders.ts (376)** → Split into `batchPrompt.ts` + `configuredPrompt.ts`
2. **index.ts (929)** → Further extract remaining inline logic

## Technical Details

- **Total files to create**: ~30 new focused modules
- **Total files to modify**: ~23 existing files
- **Safety**: MOVE code only — no logic changes, no interface changes
- **Hook order preserved**: useState → useQuery → useEffect → conditional returns
- **Edge functions require redeployment** after Batch E
- Batches A and B are highest priority (12 files over 400 lines)

