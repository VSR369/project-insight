

# Fix: Success Metrics & KPIs — AI Returns Markdown Instead of Table

## Root Cause

`SECTION_FORMAT_MAP` in the edge function's `promptTemplate.ts` is **missing** `success_metrics_kpis` and `data_resources_provided`. When Pass 2 calls `getSuggestionFormatInstruction('success_metrics_kpis')`, it defaults to `'rich_text'`, telling the LLM: *"Output: formatted markdown with headings and bullet lists. No tables. No JSON."* — the exact opposite of what's needed.

This causes:
1. AI generates markdown prose with `###` headings instead of JSON
2. `parseTableRows()` returns `null` → renders as rich text with `###` characters
3. Accept saves corrupt string → persistence fails / content is garbled
4. Re-review overwrites any existing structured data with prose

## Fix — 2 Files

### 1. Edge Function: Add missing sections to `SECTION_FORMAT_MAP`

**File:** `supabase/functions/review-challenge-sections/promptTemplate.ts` (line ~93)

Add `success_metrics_kpis: 'table'` and `data_resources_provided: 'table'` to `SECTION_FORMAT_MAP`. This ensures the LLM receives: *"Output: a JSON array of row objects. Use exact column keys from the section definition."*

### 2. Frontend: Add robust JSON extraction fallback in `parseTableRows`

**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx` (line 200-213)

Enhance `parseTableRows` to handle cases where the LLM wraps JSON in markdown prose. If `JSON.parse` fails on the cleaned string, attempt to extract the first JSON array `[...]` from the text using regex, strip markdown fences, and re-parse. This provides defense-in-depth even if the prompt is partially ignored.

```text
parseTableRows flow:
  1. Strip markdown code fences
  2. Try JSON.parse directly
  3. If fails → regex extract first [...] from text
  4. If found → JSON.parse the extracted array
  5. If still fails → return null (falls to rich_text)
```

### 3. Deploy edge function

Redeploy `review-challenge-sections` so the updated `SECTION_FORMAT_MAP` takes effect.

## Impact

- AI will generate proper JSON arrays for `success_metrics_kpis` and `data_resources_provided`
- Rendered as editable tables with KPI/Baseline/Target/Method/Timeframe columns
- Accept correctly saves structured JSON to the database
- Fallback extraction handles edge cases where LLM still wraps JSON in prose
- Re-review preserves existing curator data

