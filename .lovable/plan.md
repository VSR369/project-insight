

# Context Library — 7-Defect Fix Plan

## Confirmed Defects

| # | Defect | Impact |
|---|--------|--------|
| D1 | No auto-accept based on confidence score | High-confidence sources sit as "suggested" requiring manual review |
| D2 | Re-discover deletes previously accepted AI sources | Accepted work lost on re-discovery |
| D3 | Race condition: extraction_status not reset on accept → stale data persists | Summaries missing after accept |
| D4 | Tier 2 summary parsing is brittle — regex fails, no fallback | extracted_summary stays null |
| D5 | Seed content (search snippets) passes hasRealContent → digest uses snippets not real content | Digest ignores real sources, uses search snippets |
| D6 | Digest regeneration updates original_digest_text but Pass 2 reads digest_text → stale grounding | Digest/suggestions unchanged regardless of source selection |
| D7 | Cache not awaited after mutations → stale UI | UI doesn't reflect changes immediately |

## Implementation Phases (6 files + 1 new)

### Phase 1: Create `supabase/functions/_shared/safeJsonParse.ts` (NEW)
- `safeJsonParse<T>()` — handles fenced JSON, trailing commas, truncation, nesting
- `parseSummaryAndKeyData()` — robust SUMMARY + KEY_DATA extraction for Tier 2

### Phase 2: Fix `discover-context-resources/index.ts` (D1, D2, D3, D5)
- Add `AUTO_ACCEPT_CONFIDENCE = 0.85` threshold
- Replace destructive delete: add `.eq("discovery_status", "suggested")` to preserve accepted AI sources
- Mark seed content with `[SEED_CONTENT - PENDING EXTRACTION]` prefix
- Auto-accept only high-confidence + accessible sources; trigger extraction only for those
- Add re-discovery diversity note to query generation prompt
- Replace all `JSON.parse` calls with `safeJsonParse`

### Phase 3: Fix `extract-attachment-text/index.ts` (D4)
- Import and use `parseSummaryAndKeyData` for Tier 2 parsing
- Add fallback summary (first 300 chars of extracted text) when Tier 2 AI fails
- Mark placeholder-only extraction as `partial` or `failed` instead of `completed`

### Phase 4: Fix `generate-context-digest/index.ts` (D5, D6)
- Replace `hasRealContent()` with smarter version: accept `extracted_summary >= 50 chars`, reject `[SEED_CONTENT` markers, reject old-format seed content
- Filter query: add `.in("extraction_status", ["completed", "partial"])` to exclude pending/failed
- Fix curator_edited branch: when user explicitly regenerates, update `digest_text` AND reset `curator_edited` flag

### Phase 5: Fix `review-challenge-sections/index.ts` (D6)
- Add `original_digest_text` to the select query
- Use freshest digest for Pass 2 grounding: prefer `original_digest_text` when `curator_edited` is true

### Phase 6: Fix `useContextLibraryMutations.ts` (D3, D7)
- `useAcceptSuggestion`: reset `extraction_status`, clear stale `extracted_summary`/`extracted_key_data` before triggering fresh extraction
- `useAcceptMultipleSuggestions`: same reset pattern
- `useDiscoverSources`: `await qc.refetchQueries()` in onSuccess before showing toast with auto-accept/suggested counts
- `useRegenerateDigest`: `await qc.refetchQueries()` in onSuccess before toast

### Phase 7: Deploy + Verify
Deploy all 4 edge functions and verify against the document's 17-point checklist.

---

## Technical Details

- All changes follow the uploaded fix document line-by-line
- `safeJsonParse` is imported in discover, extract, and digest functions
- `waitForExtraction` already exists and handles polling — the accept hooks just need the reset step added before invocation
- The `extraction_status` filter in digest generation ensures seed-only content (still "pending") is excluded
- Total: ~120 lines of meaningful changes across 7 files

