

# Fix: AI Review, Re-Review, and Edit UX for All Sections

## Problems Identified

### 1. Re-review does NOT generate AI suggested content
**Root cause:** In `AIReviewInline.tsx` line 447-456, the `handleReReview` callback only processes `comments` from the re-review response — it completely ignores the `suggestion` field. It calls `onSingleSectionReview` which saves the review, but does NOT set `refinedContent` from `freshReview.suggestion`. The auto-refine effect (line 288-307) won't trigger because `autoRefineTriggered.current` is still `true` from the first review.

**Fix:** After re-review, reset `autoRefineTriggered.current = false` and extract `freshReview.suggestion` into `refinedContent` state. This mirrors what the initial review path does.

### 2. Re-review is NOT blocked by pre-flight checks
**Root cause:** The pre-flight check (`preFlightCheck()`) only runs when the user clicks the global "Review Sections by AI" button in `handleAIReview`. The per-section "Re-review this section" button in `AIReviewInline` calls the edge function directly without any pre-flight validation.

**Design decision:** Re-review should NOT be blocked by pre-flight. Pre-flight gates the initial global review because the AI needs seed content to work. Re-review is per-section and already has content — blocking it would be counterproductive. This is correct behavior.

### 3. `data_resources_provided` and `success_metrics_kpis` — Edit button does nothing
**Root cause:** Both sections fall into the `default` case of the switch statement (line 3208). The default case renders `section.render()` (read-only table view) and shows an Edit button, but when `isEditing` becomes `true`, the default case has NO editing UI — it just renders the same read-only view. There is no `TableSectionEditor` or equivalent for these table-format sections.

**Fix:** Add explicit `case` handlers for both sections with a table editor UI that allows adding/removing/editing rows and saving.

### 4. "AI Suggested Section" label wrong after re-review
**Root cause:** Same as issue #1 — since `suggestion` is ignored during re-review, the panel shows stale or empty suggestion content. The label appears but with no actual suggested content.

## Plan

### File 1: `src/components/cogniblend/shared/AIReviewInline.tsx`

**Fix re-review suggestion handling** (lines 418-465):
- After the re-review API returns successfully and `freshReview` is extracted:
  - Reset `autoRefineTriggered.current = false`
  - Reset `refinedContent` to `null`
  - Reset `editedSuggestedContent` to `null`
  - If `freshReview.suggestion` exists and is non-empty, set `refinedContent` to it
  - If no suggestion, let the auto-refine effect trigger naturally (since we reset the ref)

### File 2: `src/pages/cogniblend/CurationReviewPage.tsx`

**Add table editor for `data_resources_provided`** — new case in the switch (before `default`):
- When not editing: render the existing read-only table + Edit button
- When editing: render a `TableRowEditor` component (inline) with columns: resource, type, format, size, access_method, restrictions
- On save: call `saveSectionMutation.mutate({ field: "data_resources_provided", value: rows })`

**Add table editor for `success_metrics_kpis`** — new case in the switch:
- Same pattern with columns: kpi, baseline, target, measurement_method, timeframe
- On save: call `saveSectionMutation.mutate({ field: "success_metrics_kpis", value: rows })`

### File 3: `src/components/cogniblend/curation/renderers/TableSectionEditor.tsx` (new)

**Generic table row editor component** for JSON array table sections:
- Props: `columns: {key, label}[]`, `rows: Record<string, string>[]`, `onSave`, `onCancel`, `saving`
- Features: add row, remove row, edit cells inline
- Reusable for both data_resources and success_metrics sections

## Technical Notes

- The re-review fix is ~10 lines in `handleReReview`
- The table editor is a new ~120-line component
- Two new switch cases in CurationReviewPage (~40 lines each)
- No database or edge function changes needed

