

## Verification & Fix Plan

Let me verify the current state of `provided_comments` filtering in the edge function.
<lov-tool-use id="toolu_vrtx_01GqBC1JUHUZZakLJLKQhv9o" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/index.ts\", \"lines\": \"1100-1180\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01RpezJmMjHikVD8ivtHcR3m" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/index.ts\", \"lines\": \"1090-1180\"}">
</lov-tool-use>
Confirmed. Lines 1139-1157 call `callAIBatchTwoPass` with the unfiltered `provided_comments` at line 1150. The filter pattern at lines 1095-1096 (corrections) and 1105-1108 (examples) is the established convention in this same code block — so the fix aligns perfectly with existing architecture.

<lov-plan>

## Confirmation: Problem 4 Unfixed — Pass 2 Sub-Batch Comment Leakage

Verified at `supabase/functions/review-challenge-sections/index.ts:1139-1157`. The two-pass call passes the raw `provided_comments` array (line 1150) without filtering to the current sub-batch. When a wave splits into multiple sub-batches in Pass-2-only mode (`skip_analysis=true`), every sub-batch receives comments for ALL wave sections — the AI then generates suggestions for sections outside its sub-batch, producing duplicates across sub-batches.

The same file already establishes the correct filtering pattern twice in the immediately preceding block:
- Lines 1095-1096 — `batchKeySet` filter for `corpusCorrections`
- Lines 1105-1108 — `batchKeySet` filter for `corpusExamples`

The fix simply extends this established convention to `provided_comments`.

## Fix (single edit, ~5 lines)

**File:** `supabase/functions/review-challenge-sections/index.ts`

Insert before line 1139 (the `callAIBatchTwoPass` call), reusing the same `batchKeySet` pattern:

```ts
// Filter provided_comments to current sub-batch only (mirrors corpusCorrections
// and corpusExamples filtering above). Prevents Pass-2 cross-batch duplicate
// suggestions when a wave splits into multiple sub-batches.
const batchKeySetForComments = new Set(batch.map(b => b.key));
const batchProvidedComments = Array.isArray(provided_comments)
  ? provided_comments.filter((pc: any) => pc && batchKeySetForComments.has(pc.section_key))
  : provided_comments;
```

Then change line 1150 from `provided_comments,` to `batchProvidedComments,`.

(Naming: `batchKeySetForComments` to avoid colliding with the two existing `batchKeySet` consts in the surrounding scope.)

## Deployment

After the edit, redeploy via `supabase--deploy_edge_functions` with `["review-challenge-sections"]` so Pass-2 behavior takes effect immediately.

## Verification

1. Open a curated draft, run **Pass 1 (Analyse)** end-to-end.
2. Click **Pass 2 (Generate Suggestions)** — pick a wave that splits into 2+ sub-batches (e.g. Wave 6 with all SOLO sections).
3. Confirm in `ai_section_reviews` / diagnostics: each section receives suggestions only once, and no section receives suggestions targeting another section's content.
4. Re-run Pass 2 on a wave with a single sub-batch — behavior unchanged (sanity check that filter is a no-op when batch == wave).

## Files Touched
- `supabase/functions/review-challenge-sections/index.ts` (~6 lines added, 1 arg renamed)

No client changes. No DB migration. No new constants file (this is a server-side scoping concern within a single function body, matching the inline pattern already used twice for corrections/examples).

