

# Comprehensive Fix: All Table-Format Sections — End-to-End Audit & One-Time Fix

## Root Cause Analysis (5 interconnected issues)

### Issue 1: Wave executor overwrites content before Accept
**File:** `src/hooks/useWaveExecutor.ts` line 120  
`setSectionData(sectionKey, parsedSuggestion)` writes AI suggestions directly into the store during global review. For table-format sections, if the AI returns prose (despite prompting), the store gets corrupted prose data. This affects ALL sections during "Review with AI" global flow.

### Issue 2: AI still returns prose for table sections
The LLM tool schema types `suggestion` as `string` — the LLM can return anything. Despite prompt instructions, Gemini sometimes returns markdown prose instead of JSON arrays for `success_metrics_kpis`, `affected_stakeholders`, and `data_resources_provided`. The `parseTableRows` fallback regex extraction helps but doesn't handle all cases (e.g., when the AI returns numbered lists or tables in markdown).

### Issue 3: Extended brief subsections lack normalization in accept path
`handleAcceptExtendedBriefRefinement` (line 2110-2157) correctly parses JSON for table-format subsections but has **no field alias normalization** for `affected_stakeholders`. The AI may return `{stakeholder: "...", impact: "..."}` instead of `{stakeholder_name: "...", impact_description: "..."}`, and the data gets saved with wrong keys, rendering as empty in the table view.

### Issue 4: `handleAccept` in `AIReviewInline` doesn't handle table-format correctly when `isStructured = false`
After the previous fix that made `isStructuredSection` return `false` for `table` format, the accept path now falls through to either `hasEdits` (if user saw table UI) or `else` (raw `refinedContent` string). When `editedSuggestedContent` is set by `onSuggestedVersionChange`, it works. But when `tableRows` parsing fails (AI returned prose) and it renders as rich text, the `editedSuggestedContent` is set to the prose string via the rich_text `useEffect` — and the accept saves corrupt prose.

### Issue 5: Missing server-side sanitization of AI suggestion output
The edge function returns the raw LLM suggestion string without any server-side validation. For table-format sections, the function should attempt to extract/validate JSON before returning to the client, providing defense-in-depth.

---

## Solution: 6 Changes

### Change 1: Stop wave executor from mutating section data
**File:** `src/hooks/useWaveExecutor.ts`

Remove the `setSectionData` call (lines 114-122). AI suggestions should stay in the review/suggestion state only. The store's `setAiReview` already stores the suggestion — the `setSectionData` write is redundant and destructive.

Replace lines 114-122 with a comment explaining why we don't write to section data:
```typescript
// AI suggestions are stored in review state (setAiReview above).
// We do NOT write to setSectionData — that requires explicit Accept action.
// Writing here would corrupt table sections if AI returns prose.
```

This preserves the cross-wave context via the `setAiReview` call (line 107-111) which stores the suggestion for subsequent waves to reference, without corrupting the actual section content.

### Change 2: Add server-side JSON extraction for table sections
**File:** `supabase/functions/review-challenge-sections/index.ts` (~line 582-589)

After parsing the tool call arguments and before building the suggestion map, add a sanitization step for table-format sections:

```typescript
for (const s of sections) {
  if (s.section_key && s.suggestion) {
    const fmt = getSectionFormatType(s.section_key);
    if (fmt === 'table' || fmt === 'schedule_table') {
      // Attempt to extract JSON array from prose/markdown if needed
      const sanitized = sanitizeTableSuggestion(s.suggestion);
      suggestionMap.set(s.section_key, sanitized);
    } else {
      suggestionMap.set(s.section_key, s.suggestion);
    }
  }
}
```

Add the `sanitizeTableSuggestion` helper function in `promptTemplate.ts`:
```typescript
export function sanitizeTableSuggestion(raw: string): string {
  const cleaned = raw.trim()
    .replace(/^```(?:json)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '').trim();
  
  // Direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return JSON.stringify(parsed);
    if (parsed?.items) return JSON.stringify(parsed.items);
    if (parsed?.rows) return JSON.stringify(parsed.rows);
    if (parsed?.criteria) return JSON.stringify(parsed.criteria);
  } catch {}
  
  // Regex extract
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed)) return JSON.stringify(parsed);
    } catch {
      // Attempt repair: fix trailing commas and unbalanced brackets
      let repaired = match[0]
        .replace(/,\s*]/g, ']')
        .replace(/,\s*}/g, '}');
      const open = (repaired.match(/\[/g) || []).length;
      const close = (repaired.match(/\]/g) || []).length;
      for (let i = close; i < open; i++) repaired += ']';
      try { JSON.parse(repaired); return repaired; } catch {}
    }
  }
  
  // Return raw if extraction fails — frontend will handle fallback
  return raw;
}
```

### Change 3: Add stakeholder normalization in `handleAcceptExtendedBriefRefinement`
**File:** `src/pages/cogniblend/CurationReviewPage.tsx` (~line 2135)

After the JSON parsing and wrapper unwrapping for table-format extended brief subsections, add normalization for `affected_stakeholders`:

```typescript
// ── Affected stakeholders: normalize AI field names to canonical columns ──
if (subsectionKey === 'affected_stakeholders' && Array.isArray(valueToSave)) {
  valueToSave = (valueToSave as any[]).map((row: any) => ({
    stakeholder_name: row.stakeholder_name ?? row.stakeholder ?? row.name ?? row.Stakeholder ?? "",
    role: row.role ?? row.Role ?? "",
    impact_description: row.impact_description ?? row.impact ?? row.Impact ?? "",
    adoption_challenge: row.adoption_challenge ?? row.challenge ?? row.Challenge ?? "",
  }));
}
```

### Change 4: Add fallback table rendering when `parseTableRows` fails
**File:** `src/components/cogniblend/curation/AIReviewResultPanel.tsx`

Currently when `parseTableRows` returns null for a table-format section, it falls through to `rich_text` rendering, showing raw `###` prose. Add a format-aware fallback: if the section is a table format but parsing failed, render a warning message instead of raw prose.

In the `suggestedFormat` useMemo, add a `table_fallback` case:

```typescript
const suggestedFormat = useMemo(() => {
  if (isMasterData) return "master_data";
  if (rewardData) return "reward_custom";
  if (solverExpertiseData) return "solver_expertise";
  if (scheduleRows) return "schedule_table";
  if (tableRows) return "table";
  // If section IS table format but parse failed, show fallback instead of raw prose
  const sectionFmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
  if ((sectionFmt === 'table' || sectionFmt === 'schedule_table') && result.suggested_version) {
    return "table_fallback";
  }
  if (isStructured && structuredItems && structuredItems.length > 0) {
    const fmt = SECTION_FORMAT_CONFIG[sectionKey]?.format;
    if (fmt === "line_items") return "line_items";
  }
  if (parsedDate) return "date";
  if (result.suggested_version) return "rich_text";
  return null;
}, [/* deps */]);
```

In the render section, handle `table_fallback`:
```tsx
{suggestedFormat === "table_fallback" && (
  <div className="rounded-md border border-amber-200 bg-amber-50 p-3 space-y-2">
    <p className="text-xs text-amber-800 font-medium">
      AI returned unstructured text instead of table data. Click "Re-review" to regenerate in the correct format.
    </p>
    <div className="text-xs text-muted-foreground max-h-32 overflow-y-auto">
      <AiContentRenderer content={result.suggested_version!} compact />
    </div>
  </div>
)}
```

Disable the Accept button when format is `table_fallback`:
```tsx
// In the accept button's disabled condition, add:
disabled={isRefining || suggestedFormat === "table_fallback"}
```

### Change 5: Fix `handleAccept` to handle table sections correctly via `editedSuggestedContent`
**File:** `src/components/cogniblend/shared/AIReviewInline.tsx`

The current flow for table sections when `isStructured = false`:
- If `editedSuggestedContent != null` (set by `onSuggestedVersionChange` from `AIReviewResultPanel`), it uses `hasEdits` branch
- For table rows, `editedSuggestedContent` is the array of row objects — this is correct
- It gets `JSON.stringify`'d and passed to `onAcceptRefinement` — this is correct

But when the accept has `editedSuggestedContent` as a string (from rich_text fallback for a table section), it would save prose. Add a guard:

In `handleAccept`, after `hasEdits` check (line 645), add:
```typescript
} else if (hasEdits) {
  // Guard: if this is a table section but editedSuggestedContent is a string (prose fallback),
  // block the accept to prevent saving corrupt data
  const editFmt = getSectionFormatType(sectionKey);
  if ((editFmt === 'table' || editFmt === 'schedule_table') && typeof editedSuggestedContent === 'string') {
    toast.error("AI returned text instead of table data. Please re-review this section.");
    return;
  }
  // ... rest of existing hasEdits logic
```

### Change 6: Deploy edge function
Redeploy `review-challenge-sections` with the server-side sanitization from Change 2.

---

## Files Changed

1. `src/hooks/useWaveExecutor.ts` — Remove `setSectionData` during review (prevents data corruption)
2. `supabase/functions/review-challenge-sections/index.ts` — Add server-side JSON extraction for table sections
3. `supabase/functions/review-challenge-sections/promptTemplate.ts` — Add `sanitizeTableSuggestion` helper
4. `src/pages/cogniblend/CurationReviewPage.tsx` — Add stakeholder normalization in extended brief accept
5. `src/components/cogniblend/curation/AIReviewResultPanel.tsx` — Add `table_fallback` format and disable Accept for malformed data
6. `src/components/cogniblend/shared/AIReviewInline.tsx` — Guard accept for table sections receiving prose

## Impact Matrix

| Action | Before | After |
|--------|--------|-------|
| Global Review | Overwrites section data with AI prose | Only stores in review state; requires Accept |
| Re-review | Can corrupt existing data | Existing data preserved; only suggestion changes |
| AI table format | Shows `###` prose as rich text | Either parsed table OR clear "re-review" message |
| Accept KPIs | Saves corrupt string | Saves normalized JSON array with canonical keys |
| Accept Stakeholders | Saves with wrong field names | Saves with canonical `stakeholder_name`, `role`, etc. |
| Accept prose for table | Silently saves garbage | Blocked with clear error message |
| Edge function output | Raw LLM string | Sanitized JSON for table sections |

