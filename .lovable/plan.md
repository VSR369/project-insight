

# Render AI Suggested Version for Deliverables as Structured Cards

## Problem

When AI generates a suggested version for the Deliverables section, the refinement output (structured JSON with name/description/acceptance_criteria) gets flattened to plain name strings in `parseStructuredItems()` (line 113 of `AIReviewInline.tsx`). The `AIReviewResultPanel` then renders these as `EditableLineItems` — simple numbered text inputs. The user wants the AI suggested version to use the same card design (D1/D2 badges, descriptions, acceptance criteria blocks) as the original section.

## Plan

### 1. Preserve full deliverable objects in `AIReviewInline.tsx`

In `parseStructuredItems()` (line 103), the `line_items` branch currently flattens objects to `item?.name`. For `deliverables` and `expected_outcomes` section keys, preserve the full JSON object as a stringified row instead of flattening.

Better approach: add a new parsed state for deliverable objects alongside `structuredItems`. Create a `parsedDeliverableObjects` memo that parses the raw `refinedContent` using `parseDeliverables()` from the existing utility — only when `sectionKey` is `deliverables` or `expected_outcomes`.

Pass this as a new prop `deliverableItems` to `AIReviewResultPanel`.

### 2. Add deliverable card rendering in `AIReviewResultPanel.tsx`

In the suggested version rendering branch (lines 761-783), add a check: if `deliverableItems` is provided and non-empty, render `DeliverableCardRenderer` (read-only preview) and `DeliverableCardEditor` (for editing) instead of `EditableLineItems`.

Add new local state `editedDeliverableItems` and wire change handler to `onSuggestedVersionChange`.

### 3. Wire acceptance to pass full objects

In `AIReviewInline.tsx` `handleAccept()`, when deliverable objects are present, serialize them as `JSON.stringify({ items: deliverableObjects })` and pass to `onAcceptRefinement` — matching the format expected by `handleSaveStructuredDeliverables` in `CurationReviewPage.tsx`.

### 4. Add badge prefix awareness

Pass `badgePrefix` ("D" for deliverables, "O" for expected_outcomes) through the component chain so cards show correct badge IDs.

## Files

| File | Change |
|------|--------|
| `src/components/cogniblend/shared/AIReviewInline.tsx` | Add `parsedDeliverableObjects` memo, pass to panel, handle in accept flow |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Add `deliverableItems` prop, render card components in suggested version slot, add edit state |

## Technical details

**New prop on `AIReviewResultPanel`:**
```typescript
deliverableItems?: DeliverableItem[];
onDeliverableItemsChange?: (items: DeliverableItem[]) => void;
badgePrefix?: string;
```

**Rendering logic in suggested version slot:**
```text
if deliverableItems → DeliverableCardEditor (editable cards)
else if line_items → EditableLineItems (existing flat text)
```

**Accept flow:**
```text
if editedDeliverableItems exists → JSON.stringify({ items: editedDeliverableItems })
else if structuredItems (line_items) → existing logic
```

