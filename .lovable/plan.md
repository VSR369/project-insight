

# Fix: Success Metrics & KPIs AI Suggestion Renders as Distorted Text Instead of Table

## Problem

When the AI generates content for `success_metrics_kpis`, the suggestion is rendered as raw prose/markdown instead of a structured table. This happens because:

1. In `AIReviewResultPanel.tsx` (line 606-611), the `tableRows` parsing is hardcoded to **only** trigger for `evaluation_criteria` — it ignores all other `table`-format sections like `success_metrics_kpis`, `data_resources_provided`, and `affected_stakeholders`.

2. The `suggestedFormat` detection (line 648-661) therefore falls through to `"rich_text"` for these sections, rendering the AI JSON output as unformatted text.

## Solution

Generalize the table row parsing and rendering to apply to **all** sections with `format: 'table'` in `SECTION_FORMAT_CONFIG`, not just `evaluation_criteria`.

### File: `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

**Change 1 — Generalize `tableRows` parsing (line 606-611):**

Replace the `evaluation_criteria`-only check with a generic check for any `table`-format section:

```typescript
const tableRows = useMemo(() => {
  const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
  if (fmt === 'table' && result.suggested_version) {
    return parseTableRows(result.suggested_version);
  }
  return null;
}, [sectionKey, result.suggested_version]);
```

This single change makes `success_metrics_kpis`, `data_resources_provided`, `affected_stakeholders`, and any future `table`-format sections render correctly as editable table rows in the AI suggestion panel.

**No other files need changes** — the accept flow already handles `tableRows` via `parseRawStructuredArray` in `AIReviewInline.tsx`, and the curation page already renders saved data as a proper table (lines 778-801).

### Edge Function Prompt Reinforcement

**File: `supabase/functions/review-challenge-sections/promptTemplate.ts`**

In the `buildPass2SystemPrompt` function, add explicit output format instructions for `table`-format sections to ensure the AI consistently returns a JSON array of objects (not markdown tables or prose):

Add after the per-section enrichment loop:
```
For sections with table format, output a JSON ARRAY of objects. Example for success_metrics_kpis:
[{"kpi":"Model Accuracy","baseline":"N/A","target":"F1 > 0.85","measurement_method":"Cross-validation","timeframe":"8 weeks"}]
Do NOT output markdown tables or prose for table-format sections.
```

This ensures the AI output is always parseable as structured data.

## Impact

- Fixes distorted rendering for `success_metrics_kpis` AI suggestions
- Also fixes the same latent bug for `data_resources_provided`, `affected_stakeholders`, and all other `table`-format sections
- Backward compatible — `evaluation_criteria` continues to work identically since it also has `format: 'table'`

