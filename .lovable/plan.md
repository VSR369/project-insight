

# Plan: Format-Aware AI Suggestion Parsing

## Problem
The LLM tool schema defines `suggestion` as `type: "string"`. For rich_text sections this works. For structured sections (line_items, table, schedule_table, checkbox, tag_input), the LLM returns stringified JSON (e.g. `'["item1","item2"]'`). Two breakages occur:

1. **Store type mismatch**: `setAiReview` accepts `Record<string, unknown> | null` for suggestion — strings/arrays are silently dropped or mistyped
2. **Accept corruption**: `acceptAiSuggestion` calls `deepMerge(currentData, suggestion)` which expects two objects — a string or array causes silent failure or corrupt data

Rich text sections work by accident because the existing `AIReviewInline` auto-refine path bypasses the store's `acceptAiSuggestion` and writes directly. But the new wave-executor path (Fix 3) writes raw strings for ALL section types.

## Changes (4 files, ~60 lines total)

### 1. New utility: `src/lib/cogniblend/parseSuggestion.ts`
~35 lines. Takes `(sectionKey: string, rawSuggestion: string)` → returns parsed native type.

- Looks up format from `SECTION_FORMAT_CONFIG`
- `rich_text` → return string as-is
- `line_items`, `checkbox_multi`, `tag_input` → `JSON.parse()` → expect `string[]`
- `table`, `schedule_table` → `JSON.parse()` → expect `Record<string, unknown>[]`
- `checkbox_single` → `JSON.parse()` → expect object with selection
- `custom`, `structured_fields` → `JSON.parse()` → expect object
- All parsing wrapped in try/catch — falls back to raw string on failure

### 2. Update `src/hooks/useWaveExecutor.ts` (lines 100-111)
- Import `parseSuggestionForSection`
- Parse suggestion before writing to store (line 110): `store.getState().setSectionData(sectionKey, parseSuggestionForSection(sectionKey, suggestion))`
- Parse suggestion before passing to `setAiReview` (line 103): pass parsed value instead of raw string

### 3. Update `src/store/curationFormStore.ts`
- **Type signature** (line 32): Change `suggestion` param from `Record<string, unknown> | null` to `SectionStoreEntry['data'] | null`
- **`acceptAiSuggestion`** (lines 120-147): Add guard — if `aiSuggestion` is a string or array, replace `data` entirely instead of calling `deepMerge`. Only `deepMerge` when both current data and suggestion are plain objects.

### 4. Update edge function suggestion description
**File:** `supabase/functions/review-challenge-sections/index.ts` (lines 253-256)

Update the `suggestion` field description to instruct the LLM on format expectations per section type:
- rich_text → HTML string
- line_items → JSON array of strings
- table/schedule_table → JSON array of row objects
- checkbox → JSON object

## Implementation Order
1. Create `parseSuggestion.ts` (no dependencies)
2. Update `curationFormStore.ts` type + accept logic
3. Update `useWaveExecutor.ts` to use parser
4. Update edge function description

## Risk
- Low: try/catch fallback ensures no regression — if parsing fails, raw string behavior is preserved
- Existing `normalizeAiContentForEditor` and `challengeFieldNormalizer` run post-acceptance, so this fix ensures data arrives in correct shape before those normalizers run

