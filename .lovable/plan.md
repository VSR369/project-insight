

## Curator Fixes — Outstanding Issues Implementation Plan

### Issue #8: Wire useAutoSaveSection to Rich Text Sections

**Current state:** `TextSectionEditor` calls `onSave(val)` on every keystroke, which calls `handleSaveText` — this immediately fires `saveSectionMutation.mutate()`. There is NO debounce. The `useAutoSaveSection` hook exists but has zero call-sites.

**Fix:** The autosave hook should be wired at the renderer level where rich text sections are used. Since `handleSaveText` is already called on every change in `TextSectionEditor` and immediately calls `saveSectionMutation.mutate()`, the simplest approach is to wrap `handleSaveText` calls through `useAutoSaveSection` in `SectionPanelItem`.

However, `SectionPanelItem` is a pure function component and already passes `saveSectionMutation` down. The most targeted fix: create a thin wrapper hook `useAutoSaveField` in the renderer layer that debounces before calling `handleSaveText`.

**Actual approach:** Modify `RichTextSectionRenderer` to accept `saveSectionMutation` and `sectionDbField`, internally instantiate `useAutoSaveSection`, and route `onSave` through its `save()` method. This way only rich text sections (problem_statement, scope, hook, context_and_background) get debounced autosave. Structured sections (checkboxes, dropdowns) save immediately on selection — which is correct behavior.

**Files:**
- `src/components/cogniblend/curation/renderers/RichTextSectionRenderer.tsx` — convert to a component that uses `useAutoSaveSection` internally
- `src/components/cogniblend/curation/renderers/renderOrgSections.tsx` — pass `saveSectionMutation` + `section.dbField` to `RichTextSectionRenderer`
- `src/components/cogniblend/curation/renderers/renderProblemSections.tsx` — same for extended brief text sections

### Issue #1: Maturity Options from DB Instead of Constants

**Current state:** `useCurationMasterData` builds maturity options from hardcoded `MATURITY_LABELS` constant. The DB table `md_solution_maturity` exists with live data (Blueprint, Demo, POC, Prototype). IP models have no DB table — keeping them as constants is intentional.

**Fix:** Add a query to `useCurationMasterData` to fetch from `md_solution_maturity` instead of using `MATURITY_LABELS`. IP models remain static (no DB table exists).

**Files:**
- `src/hooks/cogniblend/useCurationMasterData.ts` — replace maturity constant with DB query from `md_solution_maturity`

### Issue #5: Unify Notice Systems

**Current state:** `IncompleteSectionsBanner` (sticky top) and `PreFlightGateDialog` (analyse popup) maintain separate logic for building incomplete section lists.

**Fix:** Extract shared incomplete-sections logic into a utility function used by both components. Make `IncompleteSectionsBanner` items clickable with the same navigate-and-highlight behavior. Both components will derive from the same data source.

**Files:**
- `src/lib/cogniblend/incompleteSectionsUtil.ts` — new shared utility
- `src/components/cogniblend/curation/IncompleteSectionsBanner.tsx` — use shared util, add per-section navigate
- `src/components/cogniblend/curation/PreFlightGateDialog.tsx` — use shared util for consistency

### Issue #7: Gate Generate Suggestions Behind Context Library

**Current state:** "Generate Suggestions" button is always clickable after pass1Done. No gate.

**Fix:** Add `contextLibraryReviewed` boolean state to the orchestrator. Set it to `true` when the Context Library drawer is closed after being opened post-analysis. Pass it to `CurationRightRail` and disable the "Generate Suggestions" button when `!contextLibraryReviewed`.

**Files:**
- `src/hooks/cogniblend/useCurationPageOrchestrator.ts` — add `contextLibraryReviewed` state, set on drawer close
- `src/components/cogniblend/curation/CurationRightRail.tsx` — accept `contextLibraryReviewed` prop, disable Generate button accordingly
- `src/pages/cogniblend/CurationReviewPage.tsx` — pass prop through

### Issue #11: Complexity Quick Select Score + Lock Logic

**Bug 1 — Quick Select finalScore:** Already partially fixed in previous batch (displayScore uses midpoint). But `handleSave` in `ComplexityAssessmentModule.tsx` line 63-68 independently recalculates — this is correct and uses the same logic. Score is NOT 0 when a level is selected. Verified: `if (!state.overrideLevel) return 0` only fires when no level selected. The lock is what needs fixing.

**Bug 2 — Lock button on Quick Select:** `canLock` at line 104-108 shows lock when `hasExistingAssessment && !showActions`. On Quick Select tab without a selection: `showActions = false` (because `overrideLevel === null`), but `hasExistingAssessment = true` if previous data exists, AND `activeTab === 'quick_select' && currentLevel != null` evaluates true if there's a prior level. Fix: add `state.overrideLevel !== null` to the quick_select condition.

**Files:**
- `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` — fix `canLock` condition for quick_select tab

### Issue #12: Reward Lock Persistence + AI Budget Split

**Bug 1 — isTypeLocked not persisted:** `getSerializedData()` does not include `isTypeLocked`. On page refresh, it resets to `false`.

**Fix:** Include `isTypeLocked` in the serialized data and restore it from existing data on mount.

**Bug 2 — AI auto-split:** When creator provides a total budget without tier breakdown, auto-split into Platinum/Gold/Silver using a standard ratio (50/30/20).

**Files:**
- `src/hooks/useRewardStructureState.ts` — include `isTypeLocked` in `getSerializedData()` output; restore from initial data in `useState`; add auto-split logic when budget_max exists without tier breakdown

### Right Rail Reorder

**Current order:** AIQualityCard → AIConfidenceSummary → CompletenessChecklist → ContextLibrary → Analyse/Generate → WaveProgress → Budget → Completion → AIReviewSummary → Actions → Legal → Modifications

**New order:** Analyse/Generate (primary action first) → CompletenessChecklist → ContextLibrary → AIQualityCard → AIConfidenceSummary → (rest same)

**Files:**
- `src/components/cogniblend/curation/CurationRightRail.tsx` — reorder JSX

---

### Summary of Files Changed

| File | Action |
|------|--------|
| `src/components/cogniblend/curation/renderers/RichTextSectionRenderer.tsx` | Modify — add `useAutoSaveSection` |
| `src/components/cogniblend/curation/renderers/renderOrgSections.tsx` | Modify — pass saveSectionMutation to renderer |
| `src/components/cogniblend/curation/renderers/renderProblemSections.tsx` | Modify — same |
| `src/hooks/cogniblend/useCurationMasterData.ts` | Modify — maturity from DB |
| `src/lib/cogniblend/incompleteSectionsUtil.ts` | Create — shared incomplete sections logic |
| `src/components/cogniblend/curation/IncompleteSectionsBanner.tsx` | Modify — use shared util |
| `src/components/cogniblend/curation/PreFlightGateDialog.tsx` | Modify — use shared util |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Modify — add contextLibraryReviewed |
| `src/components/cogniblend/curation/CurationRightRail.tsx` | Modify — gate + reorder |
| `src/pages/cogniblend/CurationReviewPage.tsx` | Modify — pass contextLibraryReviewed |
| `src/components/cogniblend/curation/ComplexityAssessmentModule.tsx` | Modify — fix canLock |
| `src/hooks/useRewardStructureState.ts` | Modify — persist isTypeLocked + auto-split |

