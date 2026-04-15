

# Comprehensive Curator Module Stabilization Plan

## Root Cause Analysis — Why Everything Feels Broken

After deep code inspection and database analysis, there are **5 interconnected root causes** explaining 95% of the reported issues:

### ROOT CAUSE 1: Suggestions NEVER reach the Zustand store (CRITICAL)
**File:** `src/hooks/useCurationStoreHydration.ts` line 162
```
storeState.setAiReview(sectionKey, newComments);  // ← missing 3rd arg: suggestion
```
The `setAiReview` signature is `(key, comments, suggestion = null)`. The suggestion from Pass 2 is in `review.suggestion` but **never passed to the store**. This means:
- `partitionSuggestionsForBulkAccept` checks `entry?.aiSuggestion` → always `null` → **Accept All finds 0 sections**
- Individual section panels never show suggestion content
- The entire Generate Suggestions flow produces results that are immediately lost

### ROOT CAUSE 2: PDF extraction fails for ALL URL-hosted PDFs
**Database evidence:** 5 of 7 sources have `extraction_quality: seed` and `extraction_method: url_pdf_failed`
The `extractPdfViaVision` function uses `btoa(String.fromCharCode(...uint8))` with spread on large arrays — this crashes with "Maximum call stack size exceeded" for PDFs larger than ~100KB. The fallback `extractPdfTextDecoder` produces garbage for binary PDFs.

**Impact chain:** Failed extraction → seed-quality sources → digest filter rejects them → digest built from 1-2 sources instead of 7 → generic suggestions.

### ROOT CAUSE 3: Extract-attachment-text logging bug masks errors
**File:** `supabase/functions/extract-attachment-text/index.ts` line 522
```
console.log(`...method=${responseData.extraction_method}, quality=${responseData.extraction_quality}`);
```
But `responseData` has `method` not `extraction_method`, and no `extraction_quality` key at all. All logs show `method=undefined, quality=undefined` — hiding every extraction failure.

### ROOT CAUSE 4: Tier 2 AI summarization silently fails for seed content
When extraction produces seed content (69–226 chars), the Tier 2 summarization prompt gets "[SEED_CONTENT - PENDING EXTRACTION]" or "PDF URL — download failed" as input. The AI generates a speculative summary from just the title/URL, which `hasRealContent()` then correctly rejects. Result: most sources get filtered out before digest generation.

### ROOT CAUSE 5: Organization tab not included in section review scope
The `ai_review_section_config` table drives which sections get reviewed. Organization context is used as CONTEXT (via `buildOrgBlock`) but organization fields themselves are never included as reviewable sections. The org data feeds into the prompt but is not assessed for completeness or quality.

---

## Fix Plan — 7 Changes, 4 Files

### Fix 1: Pass suggestion to Zustand store (THE CRITICAL FIX)
**File:** `src/hooks/useCurationStoreHydration.ts` line 162
```typescript
// BEFORE:
storeState.setAiReview(sectionKey, newComments);

// AFTER:
const suggestion = (review as any).suggestion ?? null;
const parsedSuggestion = typeof suggestion === 'string' 
  ? parseSuggestionForSection(sectionKey, suggestion) 
  : suggestion;
storeState.setAiReview(sectionKey, newComments, parsedSuggestion);
```
Import `parseSuggestionForSection` from `@/lib/cogniblend/parseSuggestion`.
Also add suggestion-change detection to the diff check so we don't skip updates when only the suggestion changed.

**This single fix restores: Accept All, per-section Accept/Reject, suggestion display in panels.**

### Fix 2: Fix PDF extraction for large files
**File:** `supabase/functions/extract-attachment-text/index.ts` — `extractPdfViaVision` function
Replace the stack-blowing `btoa(String.fromCharCode(...uint8))` with a chunked base64 encoder:
```typescript
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}
```
Apply in `extractPdfViaVision` (line 107) and in the image extraction path (line 370).

### Fix 3: Fix logging to show actual method and quality
**File:** `supabase/functions/extract-attachment-text/index.ts` line 522
```typescript
// BEFORE:
console.log(`...method=${responseData.extraction_method}, quality=${responseData.extraction_quality}`);

// AFTER:  
console.log(`...method=${method}, quality=${extractionQuality}`);
```

### Fix 4: Add Tier 2 re-extraction for seed-quality sources
**File:** `supabase/functions/extract-attachment-text/index.ts`
After the main extraction, if the result is seed/placeholder AND the source is a URL, try a Gemini-based direct content fetch as fallback (send the URL to the AI model and ask it to read the page content). This handles JavaScript-rendered pages and PDFs that the direct HTTP fetch can't process.

### Fix 5: Improve digest source filtering
**File:** `supabase/functions/generate-context-digest/index.ts` line 92
Currently excludes `extraction_quality: 'low'`. But most sources are `seed` (which passes the filter) yet `hasRealContent()` then rejects them at line 102. Change the DB query to also exclude `seed`:
```typescript
.not('extraction_quality', 'in', '("low","seed")')
```
This is more honest — don't even load sources we know we'll reject.

### Fix 6: Redeploy extract-attachment-text
After fixes 2-4, redeploy the edge function. Then manually re-extract the existing seed-quality sources by calling `extract-attachment-text` for each.

### Fix 7: Add suggestion-change detection to hydration diff
**File:** `src/hooks/useCurationStoreHydration.ts`
Add to the diff check (around line 155):
```typescript
const currentSuggestion = existing?.aiSuggestion;
const newSuggestion = (review as any).suggestion ?? null;
const suggestionChanged = JSON.stringify(currentSuggestion) !== JSON.stringify(newSuggestion);
```
And include `suggestionChanged` in the `if` condition at line 160.

---

## Files Changed

| # | File | Change | Impact |
|---|------|--------|--------|
| 1 | `src/hooks/useCurationStoreHydration.ts` | Pass suggestion to `setAiReview` + diff detection | Restores Accept All, per-section accept, suggestion display |
| 2 | `supabase/functions/extract-attachment-text/index.ts` | Chunked base64 for PDFs, fix log keys, AI URL fallback | Fixes PDF extraction, enables real content |
| 3 | `supabase/functions/generate-context-digest/index.ts` | Exclude seed-quality from DB query | Cleaner digest pipeline |

## Deploy
- `extract-attachment-text` (critical — PDF extraction + logging)

## What This Fixes End-to-End

**Pass 1 (Analyse):** Already works. Review comments are contextual (confirmed by logs: score 82, proper org/industry context).

**Discovery:** Works — finds 7 sources, auto-accepts 1. But extraction fails for PDFs → Fix 2 resolves this.

**Extraction:** Currently broken for all URL PDFs → Fix 2+4 enables real content extraction.

**Digest:** Currently gets 1-2 usable sources out of 7 → After extraction fix, all 7 sources produce real content → rich, grounded digest.

**Generate Suggestions:** Already produces quality output with full context parity (confirmed in previous fix). But suggestions are LOST before reaching the store → Fix 1 restores the entire accept flow.

**Accept All:** Currently finds 0 suggestions → Fix 1 restores this. Suggestions flow: AI → aiReviews state → store hydration → `partitionSuggestionsForBulkAccept` → sequential save.

## What Does NOT Need Fixing
- **Organisation context in analysis:** Already included via `buildOrgBlock()` in both Pass 1 and Pass 2 prompts. Org data is context, not a reviewable section — this is by design.
- **Master data governance:** Already enforced by `masterDataValidator.ts` post-AI.
- **Industry/Geo packs:** Already wired into both passes via `buildUnifiedContext`.
- **Section dependencies:** Already in both prompts via dependency map.
- **Wave progress:** Already replaced with `AnalyseProgressPanel` in the previous fix.

