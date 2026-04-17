

## Verification

Let me confirm the analysis against the codebase.
<lov-tool-use id="toolu_vrtx_01CHVvrM7RP9eLiqWMNGHNiC" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/cogniblend/waveConfig.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MNFpAA7skNFr6e7bYnVzw2" name="code--search_files" integration-id="code" data="{\"query\": \"aiCanDraft\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0189mJiiGnGHxXD9KQZuaSvi" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useWaveExecutor.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01MpKWzytrk4xNj139HHEhU2" name="code--view" integration-id="code" data="{\"file_path\": \"src/lib/cogniblend/waveConfig.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01DVqK17rZvSVyPF8NKHank4" name="code--search_files" integration-id="code" data="{\"query\": \"aiCanDraft\", \"include_patterns\": \"*.ts,*.tsx\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_016ymY1AT3acB9N7G2djqX8P" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/useWaveExecutor.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01NvL8FZEePPLcPfQLQSpmFq" name="code--search_files" integration-id="code" data="{\"query\": \"aiCanDraft: false\", \"include_patterns\": \"*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01M1fnCKTz26L5nFDbTX222U" name="code--search_files" integration-id="code" data="{\"query\": \"provided_comments\", \"include_patterns\": \"*.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_018kmCtDiBa4e3uaNBGqrJZS" name="code--view" integration-id="code" data="{\"file_path\": \"src/services/cogniblend/waveBatchInvoker.ts\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_0112nPVYHYRyMkufxPxBGnbS" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/index.ts\", \"lines\": \"1080-1180\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01LYasAqkr45kinvx44SkhJE" name="code--view" integration-id="code" data="{\"file_path\": \"src/hooks/cogniblend/useCurationAIActions.ts\"}">
</lov-tool-use>
Now I have enough context. Let me check the curationFormStore for clearAllSuggestions and other reset methods, and the QA wave handler in the edge function.
<lov-tool-use id="toolu_vrtx_01PVDngdiMax3X3VTkhcAP2Q" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"*.ts\", \"query\": \"clearAllSuggestions|setAiReview\\\\b|setReviewStatus|setAiAction\", \"search_dir\": \"src/store\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_013HCqUJMWsm6Pqtbub4X3hL" name="code--search_files" integration-id="code" data="{\"include_patterns\": \"index.ts\", \"query\": \"consistency_check|wave_action.*===.*consistency|callConsistencyPass\", \"search_dir\": \"supabase/functions/review-challenge-sections\"}">
</lov-tool-use>

<lov-tool-use id="toolu_vrtx_01RBny9nwVF45WgcR9wp2YMe" name="code--view" integration-id="code" data="{\"file_path\": \"supabase/functions/review-challenge-sections/index.ts\", \"lines\": \"320-410\"}">
</lov-tool-use>
I have all I need. Let me present the plan.

<lov-plan>

## Root Cause Confirmation

I verified all 5 problems against the codebase:

| # | Problem | Status |
|---|---|---|
| 1 | `LOCKED_SECTIONS = []` and `determineSectionAction` only special-cases `ATTACHMENT_SECTIONS` (just 2 of 6 no-draft sections). The other 4 — `approaches_not_of_interest`, `solver_audience`, `creator_legal_instructions`, `evaluation_config` — fall through to `'generate'` when empty. | **Confirmed** |
| 2 | When the AI tool-call returns malformed JSON, edge fn (`index.ts:1147-1167`) marks ALL batch sections with `is_batch_failure: true`. Wave executor surfaces every one as `error`. | **Confirmed** — fix is upstream (Problem 1) |
| 3 | `runAnalyseFlow` clears `aiReviews` array & `clearAllSuggestions()`, but `executeWaves` in `useWaveExecutor.ts` does NOT reset per-section `reviewStatus`/`aiAction` before the loop. Stale "reviewed"/"error" state leaks into the new run's diagnostics. | **Confirmed** |
| 4 | Wave 8 edge branch (`index.ts:331-383`) runs `callConsistencyPass`/`callAmbiguityPass` regardless of how many `existingReviews` exist. With sparse reviews from earlier failures both passes degrade. `invokeQaWave` then surfaces this as a generic error. | **Confirmed** |
| 5 | `waveBatchInvoker.ts:67-83` already filters `provided_comments` per sub-batch (only adds entries for sections in `reviewable`). **This is already correct** — no fix needed. | **Already fixed** |

## Plan (4 small edits aligned with project rules R2, R10, R11)

### Fix 1 — `src/lib/cogniblend/waveConfig.ts` (~10 lines)
Add a `NO_DRAFT_SECTIONS` constant (extracted from `curationSectionFormats.ts` `aiCanDraft: false` set, kept in sync via constant) and short-circuit in `determineSectionAction`:

```ts
const NO_DRAFT_SECTIONS: SectionKey[] = [
  'approaches_not_of_interest', 'creator_references', 'reference_urls',
  'solver_audience', 'creator_legal_instructions', 'evaluation_config',
];
// ...
if (NO_DRAFT_SECTIONS.includes(sectionId)) return hasContent ? 'review' : 'skip';
```
Keep the existing `ATTACHMENT_SECTIONS` branch (covers the 2-overlap subset for clarity / future divergence). Net effect: Wave 2 `approaches_not_of_interest` and Wave 6 `solver_audience` / `creator_legal_instructions` / `evaluation_config` skip cleanly when empty instead of triggering a draft → eliminates the batch-failure cascade in Waves 2/3/6.

### Fix 2 — `src/hooks/useWaveExecutor.ts` (~12 lines)
At the top of `executeWaves`, after `inFlightRef.current = true`, reset section-store AI state for every section we're about to touch:

```ts
const store = getCurationFormStore(challengeId);
for (const wave of EXECUTION_WAVES) {
  for (const sectionId of wave.sectionIds) {
    store.getState().setAiReview(sectionId, [], null);
    store.getState().setReviewStatus(sectionId, 'idle');
    store.getState().setAiAction(sectionId, null);
  }
}
```
Diagnostics now starts blank on every Re-analyse / Generate run, matching the already-cleared exec record.

### Fix 3 — `supabase/functions/review-challenge-sections/index.ts` (~8 lines, in the `consistency_check` branch around line 346)
Add an explicit guard before running the QA passes:

```ts
const MIN_REVIEWS_FOR_QA = 20;
if (existingReviews.length < MIN_REVIEWS_FOR_QA) {
  return new Response(JSON.stringify({
    success: true,
    data: {
      sections: [], skipped: true,
      reason: `Only ${existingReviews.length}/${MIN_REVIEWS_FOR_QA} sections reviewed — QA passes require more coverage.`,
      consistency_findings_count: 0, ambiguity_findings_count: 0,
      overall_coherence_score: null, overall_clarity_score: null,
    },
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
```
Then in `src/services/cogniblend/waveBatchInvoker.ts` (`invokeQaWave`) treat `data?.data?.skipped === true` as `status: 'success'` with an `errorMessage`-style note (or new `note` field) so the diagnostics panel shows "Skipped — insufficient reviews" rather than red error.

Edge function will be deployed via `supabase--deploy_edge_functions` after the edit.

### Fix 4 — Problem 5 already implemented
`waveBatchInvoker.ts:67-83` already filters `provided_comments` to the current sub-batch's reviewable sections. **No change needed.** I'll add a one-line comment confirming the invariant for future readers.

## Files Touched
- `src/lib/cogniblend/waveConfig.ts` — add `NO_DRAFT_SECTIONS`, guard `determineSectionAction`
- `src/hooks/useWaveExecutor.ts` — reset section store at start of `executeWaves`
- `supabase/functions/review-challenge-sections/index.ts` — Wave 8 minimum-coverage guard
- `src/services/cogniblend/waveBatchInvoker.ts` — surface QA `skipped` as success-with-note (small)

After edits: deploy `review-challenge-sections` immediately so Wave 8 behavior changes take effect.

## Verification After Implementation
1. **Re-analyse** on a draft with empty `approaches_not_of_interest` → Wave 2 completes; `current_deficiencies` is "Analyzed", `approaches_not_of_interest` is "Skipped". No batch failure.
2. **Re-analyse** on a draft with no `creator_references` attachments → Wave 3 completes; section status = "Skipped". `solution_type`/`maturity_level` unaffected.
3. Click **Re-analyse** twice in a row → diagnostics panel shows blank → fills wave-by-wave. No leftover "Analyzed" rows from prior run.
4. **Pass 2 (Generate)** after Pass 1 → diagnostics also resets cleanly (Pass-2 record cleared, store cleared at executeWaves entry).
5. Run on a partial draft (e.g. only 8 sections completed) → Wave 8 returns success with "Skipped — insufficient reviews", diagnostics shows neutral state, no false "QA failed" toast.

