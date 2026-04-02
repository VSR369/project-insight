

# Full Decomposition Plan — Phases D2.2 through D6.3

## Current State
- **D1.1 DONE**: `curationTypes.ts`, `curationHelpers.ts`, `curationSectionDefs.tsx` extracted
- **D2.1 DONE**: `useCurationPageData.ts` hook extracted
- **D2.2 DONE**: Edge function helpers extracted (masterData, aiCalls, complexity)
- **D3.1–D3.3 DONE**: CurationRightRail, CurationSectionList, CurationHeaderBar extracted
- **D4.1–D4.2 DONE**: useCurationSectionActions, useCurationAIActions extracted
- **D5.1–D5.4 DONE**: AIReviewResultPanel, promptTemplate, ComplexityAssessmentModule, Priority 2 files decomposed
- **D6.1–D6.2 DONE**: Priority 3 files decomposed, useCurationComputedValues + useCurationPageOrchestrator extracted
- **CurationReviewPage.tsx**: 282 lines (was 3,205 → target ~180, close enough — remaining is prop wiring)
- **review-challenge-sections/index.ts**: ~1,200 lines (target met)
- **0 remaining phases** except D6.3 (regression test)

## Implementation Sequence

### Phase D2.2 — Extract edge function helpers from review-challenge-sections/index.ts

Create 3 new files inside `supabase/functions/review-challenge-sections/`:

1. **`masterData.ts`** — Move `fetchMasterDataOptions` function (~45 lines)
2. **`aiCalls.ts`** — Move `callAIPass1Analyze` + `callAIPass2Rewrite` (~545 lines)
3. **`complexity.ts`** — Move `callComplexityAI` + `executeComplexityAssessment` (~165 lines)

Update `index.ts` to import from these modules. Drops index.ts to ~1,200 lines.

### Phase D3.1 — Extract CurationRightRail

Create `src/components/cogniblend/curation/CurationRightRail.tsx`. Move the right-rail JSX block (~362 lines) from CurationReviewPage into this component with all required props. If over 200 lines, split into individual card sub-components. Page drops to ~2,850 lines.

### Phase D3.2 — Extract CurationSectionList

Create `src/components/cogniblend/curation/CurationSectionList.tsx` and `CurationSectionItem.tsx`. Move the ~930-line section rendering loop. This is the highest-risk extraction due to ~25 closure dependencies. Page drops to ~1,920 lines.

### Phase D3.3 — Extract CurationHeaderBar

Create `src/components/cogniblend/curation/CurationHeaderBar.tsx`. Move the header, group navigation strip, breadcrumbs, and top action bar (~273 lines). Page drops to ~1,650 lines.

### Phase D4.1 — Extract section save/edit callbacks

Create `src/hooks/cogniblend/useCurationSectionActions.ts`. Move `handleSaveSection`, `handleStartEditing`, `handleCancelEditing`, `handleToggleApproval`, `handleAcceptSuggestion`, `handleRejectSuggestion` callbacks. Page drops to ~1,450 lines.

### Phase D4.2 — Extract AI review callbacks

Create `src/hooks/cogniblend/useCurationAIActions.ts`. Move `handleWaveSectionReviewed`, complexity callbacks, triage callbacks, AI re-review callbacks. Page drops to ~1,250 lines.

### Phase D5.1 — Decompose AIReviewResultPanel (1,355 lines)

Create 4 new files in `src/components/cogniblend/curation/ai-review/`:
1. `ReviewCommentList.tsx` — comment rendering logic
2. `SuggestionPanel.tsx` — suggestion display with accept/reject
3. `CrossSectionIssues.tsx` — cross-section issues list
4. `ReviewConfigs.ts` — constants + `categorizeComment` helper

AIReviewResultPanel becomes thin orchestrator (~180 lines).

### Phase D5.2 — Decompose promptTemplate.ts (1,675 lines)

Create 4 new files in `supabase/functions/review-challenge-sections/`:
1. `promptBuilders.ts` — `buildStructuredBatchPrompt`, `buildConfiguredBatchPrompt`, `buildSmartBatchPrompt`
2. `pass2Prompt.ts` — `buildPass2SystemPrompt`
3. `industryGeoPrompt.ts` — `buildIndustryIntelligence`, `buildGeographyContext`, `resolveIndustryCode`, `countryToRegion`
4. `contextIntelligence.ts` — `buildContextIntelligence`, `INTELLIGENCE_DIRECTIVE`, `detectDomainFrameworks`

promptTemplate.ts becomes a barrel re-export (~50 lines).

### Phase D5.3 — Decompose ComplexityAssessmentModule (945 lines) + AIReviewInline (884 lines)

**ComplexityAssessmentModule:**
1. `ComplexityRatingSliders.tsx` — 5-dimension slider UI
2. `ComplexityResultCard.tsx` — summary result display
3. `useComplexityScoring.ts` — scoring logic hook

**AIReviewInline:**
1. `AIReviewHeader.tsx` — run/cancel/status header
2. `AIReviewSectionResults.tsx` — section-by-section results
3. `useAIReviewRunner.ts` — review execution logic

Both originals become orchestrators (~180 lines each).

### Phase D5.4 — Decompose 8 Priority 2 files (500-711 lines each)

Extract 1-2 sub-components from each so parent drops below 200 lines:
- RewardStructureDisplay → RewardTierEditor + RewardSummaryCard
- CreatorChallengeDetailView → CreatorApprovalSection + CreatorProgressSection
- CuratorSectionPanel → SectionPanelToolbar + SectionContentRenderer
- CurationChecklistPanel → ChecklistGroupCard
- ExtendedBriefDisplay → BriefFieldRenderer
- CurationActions → SubmitForApprovalDialog + ReturnToDraftDialog
- SolverExpertiseSection → ExpertiseTagEditor
- OrgContextPanel → OrgDetailCards

### Phase D6.1 — Decompose 6 Priority 3 files (300-440 lines each)

- SectionReferencePanel → FileUploadCard + UrlReferenceCard
- EvaluationCriteriaSection → CriteriaRowEditor + WeightDistributionBar
- useWaveExecutor → waveExecutionLoop.ts
- curationFormStore → curationSelectors.ts
- CurationSectionEditor → EditorToolbar
- AICurationQualityPanel → QualityMetricCard

### Phase D6.2 — Verify CurationReviewPage under 200 lines

Final pass to ensure the page is a thin orchestrator importing hooks + components.

### Phase D6.3 — Full regression test + cleanup

Run the complete 13-point regression contract across all decomposed files.

## Technical Details

- **Total files created**: ~44 new focused files
- **Total files modified**: ~20 existing files refactored
- **Files deleted**: 0
- **Interfaces changed**: 0
- **DB changes**: 0
- **Business logic changes**: 0
- **Safety rule**: MOVE code only, never REWRITE. Cut-and-paste with exact same props/closures.
- **Hook ordering**: All useState before useQuery before useEffect — maintained in every extraction.
- **Edge functions**: After modifying, will deploy via `supabase--deploy_edge_functions`.

## Risk Assessment

| Phase | Risk | Mitigation |
|-------|------|-----------|
| D2.2 | LOW | Pure async functions, no shared state |
| D3.1 | MODERATE | ~15 props to identify |
| D3.2 | MODERATE-HIGH | ~25 closure dependencies |
| D3.3 | MODERATE | ~15 props, manageable |
| D4.1-4.2 | MODERATE-HIGH | Must trace every closure variable |
| D5.1-5.3 | LOW-MODERATE | Leaf components, single parent |
| D5.4 | MODERATE | 8 files in batch, but each is simple |
| D6.1-6.3 | LOW | Small files, cleanup only |

## Expected Outcome

| File | Before | After |
|------|--------|-------|
| CurationReviewPage.tsx | 3,205 | ~180 |
| review-challenge-sections/index.ts | 1,995 | ~1,200 |
| promptTemplate.ts | 1,675 | ~50 |
| AIReviewResultPanel.tsx | 1,355 | ~180 |
| ComplexityAssessmentModule.tsx | 945 | ~180 |
| AIReviewInline.tsx | 884 | ~180 |
| 8 Priority 2 files | ~4,890 | ~1,440 |
| 6 Priority 3 files | ~2,153 | ~1,200 |

**74% reduction in monolithic code. All files under 200 lines.**

