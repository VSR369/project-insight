

# Batched Parallel Triage with Confidence Scoring & Pass Confirmation

## Problem

The current Phase 1 triage sends all 28 sections in a single LLM call. This causes attention dilution — sections later in the prompt get superficial review, creating a high false-pass risk. Additionally, pass sections are silently accepted with no human checkpoint.

## Architecture Changes

### 1. Edge Function: `triage-challenge-sections/index.ts`

**Batch size of 4.** Instead of one call with all 28 sections, the function splits them into batches of 4 and fires all batches in parallel via `Promise.all`. Each batch gets its own focused LLM call with the same system prompt.

**Confidence score.** Add `confidence: 0.0-1.0` to the triage response schema. Update the system prompt:

```text
For each section also return a confidence score 0.0–1.0.
If confidence < 0.75, set status to "warning" even if content seems acceptable.
```

**Auto-downgrade logic.** After receiving results, any section with `confidence < 0.75` and `status: "pass"` gets overridden to `"warning"`.

**Schema change** — add `confidence` field to the tool-calling parameters:
```json
{ "confidence": { "type": "number", "description": "0.0-1.0 certainty" } }
```

**Response stays identical** — results from all batches are flattened into the same `triageResults` array. The frontend sees no structural change.

### 2. Frontend: `CurationReviewPage.tsx` — Progressive Rendering

**Utility function:**
```typescript
function chunk<T>(arr: T[], size: number): T[][] { ... }
```

**Replace single `supabase.functions.invoke("triage-challenge-sections", ...)` with parallel batched calls.** The edge function accepts a new optional `section_keys` parameter. If provided, it only triages those sections (not the full set).

```typescript
const batches = chunk(allSectionKeys, 4); // 7 batches
const results = await Promise.all(
  batches.map(batch =>
    supabase.functions.invoke("triage-challenge-sections", {
      body: { challenge_id, role_context: "curation", section_keys: batch }
    })
  )
);
```

**Progressive UI updates:** As each Promise resolves, its 4 section results merge into `aiReviews` state immediately — the user sees sections light up in groups of 4 rather than waiting for all 28.

### 3. Pass Section Soft Confirmation UI

For sections with `status: "pass"`, instead of silently marking them done, show a lightweight confirmation row inside the section card:

```text
┌──────────────────────────────────────────┐
│ ✓ Scope                      Pass  [↗]  │
│                                          │
│ AI found no issues with this section.    │
│                                          │
│ [Looks good, confirm]  [Flag for review] │
└──────────────────────────────────────────┘
```

- **"Looks good, confirm"** — marks the section as addressed (same as current accept behavior)
- **"Flag for review"** — overrides the pass status to warning and queues the section for Phase 2 deep review + refinement

This is implemented in `AIReviewResultPanel.tsx` with a new render path when `status === "pass"` and `phase === "triage"`.

### 4. BulkActionBar Update

"Accept all passing sections" now triggers the soft confirm on all pass sections (same effect, just batched). The bar text updates to reflect confidence:

```text
Review complete — 18 passed, 6 warnings, 3 AI inferred
```

No structural change to BulkActionBar — it already supports these counts.

### 5. SectionReview Type Update

Add `confidence` to the `SectionReview` interface:
```typescript
confidence?: number; // 0.0-1.0 from Phase 1 triage
```

## Files Modified

| File | Change |
|------|--------|
| `supabase/functions/triage-challenge-sections/index.ts` | Batch-of-4 parallel calls, confidence field in schema + prompt, `section_keys` parameter |
| `src/pages/cogniblend/CurationReviewPage.tsx` | `chunk()` utility, parallel batch invocations, progressive state merging |
| `src/components/cogniblend/shared/AIReviewInline.tsx` | `confidence` field on `SectionReview` type |
| `src/components/cogniblend/curation/AIReviewResultPanel.tsx` | Pass confirmation UI: "Looks good, confirm" / "Flag for review" |

## Cost & Performance

- 7 parallel calls of ~4 sections each = same wall-clock time as 1 call
- ~5,600 total input tokens vs ~5,600 for single call (similar cost)
- Each batch gets full LLM attention — eliminates attention dilution
- Confidence scoring catches borderline cases automatically

