

## Remaining Bug Fixes — Final Pass

### Bug 1 — autoSaveStatus not passed to child renderers

**Status**: Destructured in both files but never forwarded to children.

**Problem**: `LineItemsSectionRenderer` doesn't accept `autoSaveStatus` as a prop at all. `TableSectionEditor` does accept it but the ops renderer never passes it.

**Changes**:
- **`LineItemsSectionRenderer.tsx`**: Add `autoSaveStatus?: AutoSaveStatus` to props interface, import the type, render `<AutoSaveIndicator>` below the editor when in edit mode
- **`renderOpsSections.tsx`**: Pass `autoSaveStatus={autoSaveStatus}` to both `TableSectionEditor` calls (data_resources_provided, success_metrics_kpis)
- **`renderProblemSections.tsx`**: No change needed — LineItemsSectionRenderer will handle it once the prop is added; pass `autoSaveStatus` to each `LineItemsSectionRenderer` call

### Bug 3 — PreFlightGateDialog navigation race condition

**Status**: `buildIncompleteGroups` integration is done. The remaining issue is `handleNavigate` calls `onGoToSection` then `onOpenChange(false)` — dialog closes simultaneously with navigation, causing a render race.

**Change in `PreFlightGateDialog.tsx`** (line 218-221):
```ts
// Current:
const handleNavigate = (sectionId: string) => {
  onGoToSection(sectionId);
  onOpenChange(false);
};

// Fix — close dialog first, navigate after render cycle:
const handleNavigate = (sectionId: string) => {
  onOpenChange(false);
  setTimeout(() => onGoToSection(sectionId), 50);
};
```

### Bug 5a — Lock button appears for stale AI values from DB

**Status**: `hasAiValues` checks `aiDraft` values !== 5, but if the DB had non-5 scores, the draft loads them on mount and the lock button appears without curator review.

**Change in `ComplexityAssessmentModule.tsx`** (lines 104-105):
```ts
// Current:
const hasAiValues = state.activeTab === 'ai_review' &&
  Object.values(state.aiDraft).some(v => v !== 5);

// Fix — also require that at least one param has 'ai' or 'curator' source:
const hasAiValues = state.activeTab === 'ai_review' &&
  Object.values(state.aiDraft).some(v => v !== 5) &&
  Object.values(state.aiParamSources).some(s => s === 'ai' || s === 'curator');
```

This ensures the lock button only shows after an AI review has run or the curator has manually adjusted a slider.

### Bug 8 — Right rail ordering: AIQuality and Confidence still above submission actions

**Status**: Primary actions, wave, checklist, context, review summary are correctly ordered. But AIQualityCard (line 170) and AIConfidenceSummary (line 172) sit before CurationActions (line 174). User wants them after Legal Review.

**Change in `CurationRightRail.tsx`**: Move `AIQualityCard` and `AIConfidenceSummary` to after `LegalReviewPanel`, before `ModificationPointsTracker`. New order:
1. Primary AI actions
2. WaveProgressPanel
3. CompletenessChecklistCard
4. ContextLibraryCard
5. AIReviewSummaryCard
6. BudgetRevisionPanel
7. CompletionBanner
8. CurationActions
9. LegalReviewPanel
10. AIQualityCard
11. AIConfidenceSummary
12. ModificationPointsTracker

### Files changed

| File | Action |
|------|--------|
| `src/components/cogniblend/curation/renderers/LineItemsSectionRenderer.tsx` | Add `autoSaveStatus` prop + render `AutoSaveIndicator` |
| `src/components/cogniblend/curation/renderers/renderProblemSections.tsx` | Pass `autoSaveStatus` to LineItemsSectionRenderer calls |
| `src/components/cogniblend/curation/renderers/renderOpsSections.tsx` | Pass `autoSaveStatus` to TableSectionEditor calls |
| `src/components/cogniblend/curation/PreFlightGateDialog.tsx` | Fix navigation race condition in `handleNavigate` |
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Gate `hasAiValues` on `aiParamSources` |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Move AIQuality + Confidence below Legal Review |

