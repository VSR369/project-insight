

# Generate Suggestions + Discover Sources — Remaining Fixes

## What's Already Done
- `handleAnalyse` calls `analyse-challenge` (unified endpoint) — correct
- `handleGenerateSuggestions` calls `generate-suggestions` — correct
- Response field reads `data.reviews` — fixed
- Stale closure in merge — fixed (uses `mergedResult` capture)
- `generate-suggestions` accepts `pass1_reviews` from body (line 92) — done
- masterDataValidator called post-AI — done

## What's NOT Done (5 items)

### PROBLEM 1: Old wave executor still active (CRITICAL)
**Line 384**: `onProceed={o.executeWavesWithBudgetCheck}` — PreFlightDialog "Proceed" button calls the OLD wave path, overwriting reviews with `pass`.
**Line 147-155**: `handleAIReview` still calls `executeWavesWithBudgetCheck`.
**Line 392-393**: Both old functions still exported.

### PROBLEM 2: Digest is a mandatory gatekeeper
**Lines 272-294**: `handleGenerateSuggestions` returns early if digest fails — Generate Suggestions never runs.

### PROBLEM 3: aiReviews not passed to generate-suggestions
**Line 298**: `body: { challenge_id: challengeId }` — missing `pass1_reviews: aiReviews`.

### PROBLEM 4: Discovery errors silently swallowed
**Lines 239-241**: `catch { discoveryOk = false; }` — no toast, no error details.

### PROBLEM 5: Status filter too narrow in generate-suggestions
**Line 97-100**: Only processes `needs_revision`, `warning`, `generated` — misses other non-pass statuses.

---

## Implementation Plan

### File 1: `src/hooks/cogniblend/useCurationAIActions.ts`

**A. Extract `runAnalyseFlow`** — Move lines 167-263 (everything after preflight check in `handleAnalyse`) into a new `runAnalyseFlow` callback. `handleAnalyse` calls preflight then `runAnalyseFlow()`.

**B. Redirect `handleAIReview`** — Replace body with `await handleAnalyse()`.

**C. Make digest optional** — In `handleGenerateSuggestions`, wrap digest call in try/catch. Show info toast on failure. Always proceed to `generate-suggestions`.

**D. Pass `aiReviews` to generate-suggestions** — Change body to `{ challenge_id: challengeId, pass1_reviews: aiReviews }`.

**E. Surface discovery errors** — Replace silent catch with detailed error handling: check `discoverError`, `discoverResult?.success`, show toast with specifics, invalidate queries.

**F. Update exports** — Remove `executeWavesWithBudgetCheck` from return. Add `runAnalyseFlow`. Keep `handleAIReview` as alias.

### File 2: `src/pages/cogniblend/CurationReviewPage.tsx`

**G. Fix PreFlightDialog onProceed** — Change from `o.executeWavesWithBudgetCheck` to:
```
onProceed={async () => {
  o.setPreFlightDialogOpen(false);
  await o.runAnalyseFlow();
}}
```

### File 3: `supabase/functions/generate-suggestions/index.ts`

**H. Broaden status filter** — Change to exclude only `pass` and `best_practice` instead of including only 3 statuses.

**I. Handle `{sections:{}}` wrapper** — Parse AI response to unwrap potential `sections` key and filter out meta keys like `overall_assessment`.

### Edge Functions to Deploy
- `generate-suggestions`
- `discover-context-resources` (redeploy for latest code)

