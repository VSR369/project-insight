

## Two-Pass Pipeline Optimization — 6 Fixes

### Problem
1. "Analyse Challenge" wastefully runs Pass 2 (generating suggestions) then strips the results — doubling AI cost and latency
2. Discovery runs in parallel with Pass 1 instead of after it
3. "Generate Suggestions" re-runs Pass 1 from scratch instead of reusing existing analysis comments
4. Discovered sources default to `"suggested"` status instead of `"accepted"`

### Changes

**Fix 1 — `src/hooks/useWaveReviewSection.ts`**
Add `skipAnalysis` and `providedCommentsBySectionKey` options. When `skipAnalysis` is true, send `skip_analysis: true` and `provided_comments` (from stored Pass 1 reviews) in the edge function body. Add both to the `useCallback` dependency array.

**Fix 2 — `src/hooks/useWaveExecutor.ts`**
Add `skipAnalysis` and `providedCommentsBySectionKey` to `UseWaveExecutorOptions` interface. Forward both to `useWaveReviewSection`.

**Fix 3 — `src/hooks/cogniblend/useCurationWaveSetup.ts`**
- Add an `aiReviewsRef` that stays in sync with `aiReviews` via a `useEffect`
- Create a `buildPass2CommentMap` helper that converts `SectionReview[]` into `Record<string, unknown[]>`
- Add a third executor `pass2Executor` with `skipAnalysis: true` and `providedCommentsBySectionKey` built from `aiReviewsRef.current`
- Expose `executeWavesPass2` in the return object
- Track pass2Executor completion for completeness check trigger (alongside fullExecutor)

**Fix 4 — `src/hooks/cogniblend/useCurationAIActions.ts`**
- Add `executeWavesPass2` to the options interface and destructure it
- In `handleAnalyse`: Move `discover-context-resources` call to AFTER `await executeWavesPass1()` completes (sequential, not parallel). Keep the query invalidation and drawer open logic after discovery completes.
- In `handleGenerateSuggestions`: Replace `executeWavesFull()` with `executeWavesPass2()` so it only runs Pass 2 using stored comments. Add `executeWavesPass2` to deps.

**Fix 5 — `supabase/functions/review-challenge-sections/index.ts`** (lines 842-872)
When `pass1_only === true`, call `callAIPass1Analyze` directly instead of `callAIBatchTwoPass`. This completely skips Pass 2 — no wasted API call. Remove the post-hoc suggestion-stripping block (lines 867-872) since it becomes unnecessary.

**Fix 6 — `supabase/functions/discover-context-resources/index.ts`** (line 320)
Change `discovery_status: "suggested"` to `discovery_status: "accepted"` so AI-discovered sources are auto-accepted and the curator only needs to reject unwanted ones.

### Architecture After Fix

```text
[Analyse Challenge]
  └─ Pass 1 ONLY (callAIPass1Analyze) → 6 waves, 31 sections
  └─ AFTER completion: discover-context-resources (sequential)
  └─ Auto-open Context Library (sources auto-accepted)

[Curator reviews Context Library]
  └─ Reject unwanted sources → close drawer

[Generate Suggestions]
  └─ generate-context-digest (from accepted sources)
  └─ Pass 2 ONLY (skip_analysis=true, provided_comments from stored reviews)
  └─ 6 waves, 31 sections → Principal Consultant quality suggestions
```

### Impact
- ~50% reduction in AI API cost during Analyse (no wasted Pass 2)
- ~40% faster Analyse step
- ~30% faster Generate Suggestions (no redundant Pass 1)
- Suggestions grounded in verified context digest

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useWaveReviewSection.ts` | Add `skipAnalysis` + `providedCommentsBySectionKey` |
| `src/hooks/useWaveExecutor.ts` | Forward new options to review section hook |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Add pass2Executor, expose `executeWavesPass2` |
| `src/hooks/cogniblend/useCurationAIActions.ts` | Sequential discovery; use pass2 executor for suggestions |
| `supabase/functions/review-challenge-sections/index.ts` | Short-circuit to Pass 1 only when `pass1_only` |
| `supabase/functions/discover-context-resources/index.ts` | Auto-accept discovered sources |

