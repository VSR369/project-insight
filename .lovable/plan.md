

# Auto-Detect & Render Tabular AI Line Items

## Problem

When AI returns structured JSON objects as line items (e.g., `{"criterion":"Model Accuracy","weight":30,"scoring_method":"AUC > 0.90 = 30pts","evaluator_role":"Lead Data Scientist"}`), the `EditableLineItems` component renders them as raw JSON strings in textareas. They should render as a professional table matching the reference screenshot.

## Changes

### 1. New utility: `src/utils/detectAndParseLineItems.ts`

- `detectAndParseLineItems(items: string[])` — tries `JSON.parse` on each item; if all parse to objects, returns `{ type: 'table', schema: string[], rows: Record<string, string>[] }`, otherwise `{ type: 'plain', ... }`
- `parseScoringMethod(raw: string)` — splits `"X = 20 pts, Y = 10 pts"` into `[{ condition, points }]` for multi-line rendering

### 2. New component: `src/components/cogniblend/curation/renderers/TableLineItemRenderer.tsx`

A styled editable table matching the reference screenshot:

| Element | Style |
|---------|-------|
| Container | `bg-white border border-gray-100 rounded-xl overflow-hidden` |
| thead | `bg-gray-50`, columns uppercase 11px semibold |
| "criterion" column | `font-medium text-gray-900` |
| "weight" column | Color-coded pill badge (≥25 green, 15-24 purple, <15 gray) + "pts" suffix |
| "scoring_method" column | Parsed via `parseScoringMethod()`, each segment on its own line: **condition** = points |
| "evaluator_role" column | Gray pill badge with subtle border |
| Delete column | Trash icon, visible on row hover only |
| Footer | Total weight sum (green if 100, amber if not) + "+ Add criterion" row |

Props: `rows`, `schema`, `onChange`, `onAddRow`, `onRemoveRow` — fully editable inline (inputs for criterion/weight/evaluator_role, textarea for scoring_method).

### 3. Wire into `AIReviewResultPanel.tsx`

In the structured items branch (line ~759-762), before rendering `EditableLineItems`:

```
const detection = detectAndParseLineItems(structuredItems);
if (detection.type === 'table') {
  render <TableLineItemRenderer rows={detection.rows} schema={detection.schema} onChange={...} />
} else {
  render existing <EditableLineItems ... />
}
```

The `onChange` callback serializes edited rows back to `string[]` (each row as `JSON.stringify(rowObj)`) so the existing `onSuggestedVersionChange` and accept flow works unchanged.

### 4. No edge function changes needed

The `parseTableRows` function already handles JSON array parsing. The `SECTION_FORMAT_CONFIG` already marks `evaluation_criteria` as `table` format. The issue is purely in the rendering path — structured items arrive as `string[]` where each string is a JSON object, and `EditableLineItems` doesn't detect this.

## Files

| File | Action |
|------|--------|
| `src/utils/detectAndParseLineItems.ts` | Create — JSON detection + scoring method parser |
| `src/components/cogniblend/curation/renderers/TableLineItemRenderer.tsx` | Create — Professional editable table renderer |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Edit lines 759-762 — add detection branch |
| `src/components/cogniblend/curation/renderers/index.ts` | Edit — add barrel export |

