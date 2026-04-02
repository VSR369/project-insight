

# Decomposition Gap Analysis and Fix Plan

## Current State vs Target — Files Still Over 200 Lines

| # | File | Current | Target | Status |
|---|------|:-------:|:------:|--------|
| 1 | CurationSectionList.tsx | 1,053 | ~200 | GAP — needs further decomposition |
| 2 | AIReviewInline.tsx | 711 | ~180 | GAP — only helpers extracted, still huge |
| 3 | RewardStructureDisplay.tsx | 711 | ~180 | GAP — untouched |
| 4 | aiCalls.ts (edge fn) | 750 | ~200 | GAP — extracted but still large |
| 5 | CurationChecklistPanel.tsx | 639 | ~180 | GAP — untouched |
| 6 | CuratorSectionPanel.tsx | 581 | ~180 | GAP — only StatusBadge extracted |
| 7 | ExtendedBriefDisplay.tsx | 580 | ~180 | GAP — untouched |
| 8 | useCurationPageOrchestrator.ts | 560 | ~200 | GAP — newly created but oversized |
| 9 | AIReviewResultPanel.tsx | 556 | ~180 | GAP — only ReviewConfigs extracted |
| 10 | ComplexityAssessmentModule.tsx | 503 | ~180 | GAP — only sub-components extracted |
| 11 | CurationActions.tsx | 496 | ~180 | GAP — only modals extracted |
| 12 | CreatorChallengeDetailView.tsx | 478 | ~180 | GAP — only renderers extracted |
| 13 | useCurationAcceptRefinement.ts | 433 | ~200 | GAP — newly created but oversized |
| 14 | SolverExpertiseSection.tsx | 426 | ~180 | GAP — only hook extracted |
| 15 | CurationRightRail.tsx | 425 | ~200 | GAP — extracted but not split further |
| 16 | CurationHeaderBar.tsx | 392 | ~200 | GAP — extracted but not split further |
| 17 | promptBuilders.ts (edge fn) | 376 | ~200 | GAP — extracted but still large |
| 18 | useCurationPageData.ts | 329 | ~200 | GAP — needs selector extraction |
| 19 | useCurationSectionActions.ts | 328 | ~200 | GAP — still over target |
| 20 | OrgContextPanel.tsx | 519 | ~180 | GAP — untouched |
| 21 | AICurationQualityPanel.tsx | 304 | ~200 | GAP — untouched |
| 22 | SectionReferencePanel.tsx | 280 | ~200 | Borderline — AttachmentCard extracted |
| 23 | EvaluationCriteriaSection.tsx | 289 | ~200 | Borderline — sub-components extracted |
| 24 | useCurationAIActions.ts | 265 | ~200 | Borderline |
| 25 | useCurationComputedValues.ts | 249 | ~200 | Borderline |

## Files Meeting Target

| File | Lines | Status |
|------|:-----:|--------|
| CurationReviewPage.tsx | 282 | DONE (was 4,402) |
| review-challenge-sections/index.ts | 929 | Improved (was 1,995) |
| promptTemplate.ts | 52 | DONE (barrel) |
| useWaveExecutor.ts | 235 | Improved |
| curationFormStore.ts | 268 | Improved |

## Implementation Plan — 6 Batches

### Batch 1: CurationSectionList (1,053 lines — largest gap)

Extract `CurationSectionItem.tsx` (~200 lines) containing the per-section rendering logic (panel + editor + AI review slot assembly). Extract `SectionGroupHeader.tsx` (~80 lines) for group dividers. The list becomes a thin map-and-delegate orchestrator (~200 lines).

### Batch 2: AIReviewResultPanel (556) + AIReviewInline (711)

**AIReviewResultPanel**: Extract `ReviewCommentList.tsx` (comment rendering loop) and `SuggestionPanel.tsx` (suggestion display with accept/reject). Parent becomes ~180 lines.

**AIReviewInline**: Extract `AIReviewSectionRunner.tsx` (the run/cancel/status UI) and `AIReviewSuggestionRenderer.tsx` (format-aware suggestion display). Parent becomes ~180 lines.

### Batch 3: Priority 2 files still untouched

- **RewardStructureDisplay (711)**: Extract `RewardTierEditor.tsx` + `RewardSummaryCard.tsx`
- **CurationChecklistPanel (639)**: Extract `ChecklistGroupCard.tsx` + `ChecklistProgressBar.tsx`
- **CuratorSectionPanel (581)**: Extract `SectionPanelToolbar.tsx` (action buttons, accept/undo) + `SectionFullscreenModal.tsx`
- **ExtendedBriefDisplay (580)**: Extract `BriefFieldRenderer.tsx` (individual field display)
- **OrgContextPanel (519)**: Extract `OrgDetailCards.tsx`
- **CurationActions (496)**: Further extract `ActionButtonGroup.tsx`
- **CreatorChallengeDetailView (478)**: Extract `CreatorTabContent.tsx`
- **SolverExpertiseSection (426)**: Extract `ExpertiseTagEditor.tsx`

### Batch 4: Extracted components that are themselves oversized

- **CurationRightRail (425)**: Split into `RightRailCards.tsx` (individual card components)
- **CurationHeaderBar (392)**: Extract `GroupNavigationStrip.tsx` + `CurationBanners.tsx`
- **ComplexityAssessmentModule (503)**: Further extract tab content components
- **AICurationQualityPanel (304)**: Extract `QualityMetricCard.tsx`

### Batch 5: Oversized hooks

- **useCurationPageOrchestrator (560)**: Extract `useCurationEffects.ts` (useEffect blocks) and `useCurationMutations.ts` (mutation definitions)
- **useCurationAcceptRefinement (433)**: Extract `normalizeAIContent.ts` (pure normalization functions — no hooks needed)
- **useCurationPageData (329)**: Extract query definitions into `curationQueries.ts`
- **useCurationSectionActions (328)**: Extract pure helpers into `sectionActionHelpers.ts`

### Batch 6: Edge function oversized modules

- **aiCalls.ts (750)**: Split `callAIPass1Analyze` and `callAIPass2Rewrite` into separate files
- **promptBuilders.ts (376)**: Split into `batchPrompt.ts` and `configuredPrompt.ts`

## Technical Details

- Total files to create: ~30 new focused files
- Total files to modify: ~25 existing files
- Safety rule: MOVE code only, never REWRITE
- No interface changes, no DB changes, no behavior changes
- Hook ordering maintained: useState → useQuery → useEffect → conditional returns
- Edge functions must be redeployed after Batch 6

## Priority Order

Batch 1 first (biggest single file at 1,053 lines), then Batch 2 (two large UI components), then Batch 3 (8 untouched Priority 2 files), then Batches 4-6.

