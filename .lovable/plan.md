

# Plan: Preserve Structured Format for Deliverables (View + AI Refinement)

## Problem

The Deliverables section renders as a dense `<ol>` list (image 1) where long descriptions blend together visually like one paragraph. The edit mode (image 2) correctly shows each item as a separate bordered input. The view mode should mirror this visual separation — each deliverable as a distinct card/block, not a run-on numbered list.

Additionally, AI refinement must always return content in the same structural format as the original section data (JSON array for deliverables, not prose).

## Changes

### 1. Update Deliverables view-mode render (`CurationReviewPage.tsx`)

Replace the dense `<ol>` at lines 244-249 with visually separated cards:

```tsx
render: (ch) => {
  const raw = parseJson<any>(ch.deliverables);
  const d = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : null;
  if (!d || d.length === 0) return <p className="text-sm text-muted-foreground">None defined.</p>;
  return (
    <div className="space-y-2">
      {d.map((item: any, i: number) => (
        <div key={i} className="rounded-md border bg-muted/30 px-3 py-2 text-sm text-foreground">
          <span className="font-medium text-muted-foreground mr-2">{i + 1}.</span>
          {typeof item === "string" ? item : item?.name ?? JSON.stringify(item)}
        </div>
      ))}
    </div>
  );
},
```

Each deliverable gets its own bordered block — visually matching the edit mode pattern.

### 2. Apply same card-style render to Evaluation Criteria

The `evaluation_criteria` render (currently a table or inline list) should also use separated card blocks for consistency.

### 3. No edge function or AIReviewInline changes needed

The structured parsing pipeline (`parseStructuredItems`, `handleAccept` with JSON wrapper, `handleAcceptRefinement` with JSON extraction) is already correct — AI returns JSON arrays, items are parsed individually, and the DB stores `{items: [...]}`. The visual issue is purely in the read-only render function.

## Files Changed

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Replace `<ol>` deliverables render with card-style separated blocks; similar update for evaluation_criteria render |

