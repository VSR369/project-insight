

# Fix: Line Items Accept Pipeline Corrupting Data

## Root Cause

When accepting AI suggestions for `line_items` format sections (e.g., `submission_guidelines`), the accept handler in `AIReviewInline.tsx` (line 480) calls:

```tsx
onAcceptRefinement(sectionKey, JSON.stringify(accepted))
// produces: '["item1","item2","item3"]'
```

This raw JSON string then flows to `handleAcceptRefinement` in `CurationReviewPage.tsx` where:
- `dbField` = `"description"` (for submission_guidelines)
- `"description"` is NOT in `JSON_FIELDS` array → no JSON parsing
- `"description"` IS in `HTML_TEXT_FIELDS` → `normalizeAiContentForEditor('["item1","item2"]')` → produces `<p>["item1","item2"]</p>`

Result: the screenshot shows `<p>["A detailed technical proposal...","Source code..."]</p>` as literal text.

## Fix (2 files)

### File 1: `src/components/cogniblend/shared/AIReviewInline.tsx` (lines 474-480)

In the `handleAccept` callback, add format-aware serialization for `line_items` sections. Before the generic `JSON.stringify(accepted)` at line 480, check if the format is `line_items` and wrap as `{ items: accepted }` — matching the manual edit save format used at `CurationReviewPage.tsx:2139`.

```tsx
// Line 474-480: Replace the else branch
} else {
  const accepted = structuredItems.filter((_, i) => selectedItems.has(i));
  if (accepted.length === 0) {
    toast.error("Select at least one item to accept.");
    return;
  }
  // Format-aware serialization
  const fmt = getSectionFormatType(sectionKey);
  if (fmt === 'line_items') {
    onAcceptRefinement(sectionKey, JSON.stringify({ items: accepted }));
  } else {
    onAcceptRefinement(sectionKey, JSON.stringify(accepted));
  }
}
```

### File 2: `src/pages/cogniblend/CurationReviewPage.tsx` (line 1485)

Add `"description"` to `JSON_FIELDS` so the accept handler parses it as JSON instead of treating it as HTML text:

```tsx
const JSON_FIELDS = ['deliverables', 'evaluation_criteria', 'phase_schedule', 'reward_structure', 'description'];
```

And remove `"description"` from `HTML_TEXT_FIELDS` (line 1503) since it's now a structured JSON field:

```tsx
const HTML_TEXT_FIELDS = ['problem_statement', 'scope', 'hook'];
```

This ensures `{ items: [...] }` is parsed as JSON and saved as a proper JSONB object, which the `LineItemsSectionRenderer` already knows how to read.

### Also fix: edited content path (line 453-454)

The same bug exists when the user manually edits line items in the suggestion panel and then accepts. Line 453-454:

```tsx
} else if (Array.isArray(editedSuggestedContent)) {
  const fmt = getSectionFormatType(sectionKey);
  if (fmt === 'line_items') {
    onAcceptRefinement(sectionKey, JSON.stringify({ items: editedSuggestedContent }));
  } else {
    onAcceptRefinement(sectionKey, JSON.stringify(editedSuggestedContent));
  }
}
```

## Files Modified

| File | Change |
|------|--------|
| `AIReviewInline.tsx` | Wrap line_items as `{ items: [...] }` in 3 accept paths (lines 447, 454, 480) |
| `CurationReviewPage.tsx` | Add `description` to `JSON_FIELDS`, remove from `HTML_TEXT_FIELDS` |

