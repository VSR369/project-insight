

# Make AI Suggested Version Editable by Default (No Edit Button)

## What changes

Remove the explicit "Edit" toggle button from the AI Suggested Version panel. Instead, the suggested content should render in editable mode immediately — textarea for rich text, inline inputs for line items/tables/schedules. The user edits directly and clicks "Accept & Save" when ready.

## Changes

### File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

1. **Remove `isEditing` state** — replace with always-on editing
2. **Auto-seed edit state on mount/data change** — use `useEffect` to initialize `editedRichText`, `editedLineItems`, `editedTableRows`, `editedScheduleRows` from incoming data whenever `result.suggested_version` or `structuredItems` change
3. **Remove the Edit/Done Editing button** (lines 500-510) and the `canEdit` / `handleToggleEdit` logic
4. **Always render editable components** — replace all `{isEditing && editedX ? <EditableX /> : <ReadOnlyX />}` ternaries with just the editable version (for non-master-data formats)
5. **Emit changes on every keystroke** — call `onSuggestedVersionChange` from the `setEdited*` callbacks (debounced or on blur) so the parent always has the latest content
6. **Master data sections unchanged** — already interactive via checkboxes

### File: `src/components/cogniblend/shared/AIReviewInline.tsx`

No structural changes needed — it already tracks `editedSuggestedContent` state and uses it in `handleAccept`. The `onSuggestedVersionChange` callback is already wired.

## Summary of UX change

Before: View AI suggestion → Click Edit → Modify → Click Done Editing → Accept & Save
After: View AI suggestion (already editable) → Modify if needed → Accept & Save

## Files to modify

| File | Change |
|------|--------|
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Remove edit toggle, auto-initialize edit state, always render editable components, emit changes continuously |

