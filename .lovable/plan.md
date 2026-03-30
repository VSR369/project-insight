

# Fix: Success Metrics & KPIs — End-to-End (Format, Accept, Persistence, Re-review)

## Problems Identified

1. **AI returns markdown prose instead of JSON table rows** — The line-based fallback parser in `parseStructuredItems` splits the prose into 46 individual text lines (as shown in the screenshot), each rendered as a numbered editable item instead of a structured table.

2. **Accept doesn't save** — `JSON_FIELDS` (line 1955 in `CurationReviewPage.tsx`) does not include `success_metrics_kpis`. The raw content goes to `saveSectionMutation.mutate()` as a string instead of being parsed as a JSON array first.

3. **Re-review loses curator data** — When re-review runs, `currentContent` is correctly sourced from `challenge.success_metrics_kpis`. However, if a previous Accept saved corrupt string data (due to bug #2), subsequent reads return broken content or null, making it appear the curator's data was lost.

4. **Format detection priority conflict** — `isStructuredSection()` returns `true` for `table` format sections. The `suggestedFormat` detection (line 648-661) checks `isStructured && structuredItems` before `tableRows`, so if `parseStructuredItems` succeeds (even with garbage line-split data), it short-circuits the proper `table` path.

## Solution — 4 Changes

### Change 1: Add `success_metrics_kpis` to `JSON_FIELDS` in accept handler

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (line 1955)

Add `success_metrics_kpis` and `data_resources_provided` to the `JSON_FIELDS` array so their AI output is parsed as JSON before saving:

```typescript
const JSON_FIELDS = ['deliverables', 'expected_outcomes', 'evaluation_criteria', 
  'phase_schedule', 'reward_structure', 'description', 'domain_tags',
  'success_metrics_kpis', 'data_resources_provided'];
```

This ensures the accepted content is saved as a proper JSON array to the database, not as a raw string.

### Change 2: Fix `suggestedFormat` priority — `table` must win over `line_items`

**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx` (line 648-661)

The `suggestedFormat` detection currently checks `isStructured && structuredItems` (which matches `table` format too) before checking `tableRows`. Reorder so `tableRows` is checked first:

```typescript
const suggestedFormat = useMemo(() => {
  if (isMasterData) return "master_data";
  if (rewardData) return "reward_custom";
  if (solverExpertiseData) return "solver_expertise";
  if (scheduleRows) return "schedule_table";
  if (tableRows) return "table";                    // ← Move BEFORE line_items check
  if (isStructured && structuredItems && structuredItems.length > 0) {
    const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
    if (fmt === "line_items") return "line_items";
  }
  if (parsedDate) return "date";
  if (result.suggested_version) return "rich_text";
  return null;
}, [/* deps */]);
```

This ensures that when the AI does return valid JSON for a `table`-format section, it renders as an editable table — not as line items.

### Change 3: Make `parseStructuredItems` skip `table` format sections

**File:** `src/components/cogniblend/shared/AIReviewInline.tsx` (line 128-175)

Currently `isStructuredSection` returns `true` for `table` format, which triggers `parseStructuredItems`. For `table`-format sections, the parsing path should be `parseTableRows` (in `AIReviewResultPanel`), not `parseStructuredItems` (which falls back to line-splitting).

Update `isStructuredSection` to exclude `table` and `schedule_table`:

```typescript
function isStructuredSection(sectionKey: string): boolean {
  const fmt = SECTION_FORMAT_CONFIG[sectionKey];
  if (!fmt) return false;
  // table/schedule_table are handled by their own dedicated parsers in AIReviewResultPanel
  return fmt.format === 'line_items';
}
```

This prevents the line-splitting fallback from corrupting table data. The `tableRows` parsing in `AIReviewResultPanel` already handles `table` format sections correctly.

### Change 4: Add table-format normalization in accept handler (like eval_criteria)

**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (after the eval_criteria normalization block, ~line 2011)

Add a normalization block for `success_metrics_kpis` to ensure the saved data matches the expected column schema:

```typescript
// ── Success Metrics & KPIs: normalize AI field names to canonical columns ──
if (dbField === 'success_metrics_kpis' && valueToSave && typeof valueToSave === 'object') {
  const rawArr = Array.isArray(valueToSave) ? valueToSave : (valueToSave?.items ?? null);
  if (rawArr && Array.isArray(rawArr)) {
    valueToSave = rawArr.map((row: any) => ({
      kpi: row.kpi ?? row.metric ?? row.name ?? row.KPI ?? "",
      baseline: row.baseline ?? row.Baseline ?? "",
      target: row.target ?? row.Target ?? "",
      measurement_method: row.measurement_method ?? row.method ?? row.Method ?? "",
      timeframe: row.timeframe ?? row.Timeframe ?? row.timeline ?? "",
    }));
  }
}
```

Similarly for `data_resources_provided`:
```typescript
if (dbField === 'data_resources_provided' && valueToSave && typeof valueToSave === 'object') {
  const rawArr = Array.isArray(valueToSave) ? valueToSave : (valueToSave?.items ?? null);
  if (rawArr && Array.isArray(rawArr)) {
    valueToSave = rawArr; // Already structured — just unwrap from wrapper
  }
}
```

## Impact

- **Rendering**: AI suggestions for `success_metrics_kpis` display as an editable table (KPI, Baseline, Target, Method, Timeframe) — not as 46 numbered text lines
- **Accept**: Clicking "Accept" saves a proper JSON array to the database
- **Re-review**: Curator's manually entered data is preserved because it's stored as valid JSON, not corrupt strings
- **Backward compatible**: No changes to `evaluation_criteria` or other sections that already work

## Files Changed

1. `src/pages/cogniblend/CurationReviewPage.tsx` — Add to JSON_FIELDS + add normalization block
2. `src/components/cogniblend/curation/AIReviewResultPanel.tsx` — Fix suggestedFormat priority
3. `src/components/cogniblend/shared/AIReviewInline.tsx` — Exclude table formats from isStructuredSection

