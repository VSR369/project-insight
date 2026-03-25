

# Edit Before Accept — AI Suggested Versions

## What changes

Add an "Edit" toggle to the AI Suggested Version panel in `AIReviewResultPanel.tsx`. When active, the read-only preview becomes editable inline. Edited content flows through the existing Accept path.

## Changes

### 1. `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

- Add `isEditing` local state + `onSuggestedVersionChange` callback prop
- Add a pencil/edit toggle button next to the "AI Suggested Version" heading
- When editing is ON, swap renderers per format:

| Format | Current (read-only) | Edit mode |
|--------|-------------------|-----------|
| Rich text | `AiContentRenderer` | `Textarea` (multi-line, preserves markdown) |
| Line items | Checkbox list | Each item becomes an `Input` + add/remove row buttons |
| Table (eval_criteria) | `TableSectionRenderer readOnly` | Inline `Input` fields per row (name, weight, description) + add/remove |
| Schedule table | `ScheduleTableSectionRenderer readOnly` | Inline `Input` fields per row (phase, duration, dates) + add/remove |
| Master data chips | Selectable checkboxes | No change — already interactive |

- Edited values are tracked via local state and emitted through `onSuggestedVersionChange`
- Accept button uses edited data when available

### 2. `src/components/cogniblend/shared/AIReviewInline.tsx`

- Add `editedRefinedContent` state (initially null)
- Pass `onSuggestedVersionChange` callback to `AIReviewResultPanel` that updates this state
- In `handleAccept`, use `editedRefinedContent ?? refinedContent` as the source content
- Reset `editedRefinedContent` on Discard

## Files to modify

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Add edit toggle, editable inline renderers, `onSuggestedVersionChange` prop |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Track edited version state, pass callback, use in accept handler |

