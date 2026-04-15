

# Fix: Wave Execution Abandoned Due to Query Invalidation Unmounting Page

## Root Cause

When the wave executor completes each section review, it saves results to the DB via `saveSectionMutation.mutate()`. The mutation's `onSuccess` handler invalidates the `['curation-review', challengeId]` query. This triggers a data refetch, and during refetch `isLoading` can flip to `true`. The CurationReviewPage has an early return: `if (o.isLoading) return <Skeleton/>` — this **unmounts the entire component tree**, killing the wave executor's async loop silently. When the page remounts, all wave state is lost and the user sees the idle curator screen.

The edge function logs confirm all calls returned HTTP 200 — the server worked fine. This is purely a client-side unmount issue.

## Fix Strategy (Two Changes)

### 1. Prevent page unmount during wave execution

**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

Change the loading guard so it only shows the skeleton on **initial** load, not during background refetches:

```
// BEFORE (line 68):
if (o.isLoading) return <Skeleton.../>

// AFTER:
if (o.isLoading && !o.isWaveRunning) return <Skeleton.../>
```

This ensures that while waves are running, the page stays mounted even if the underlying query is refetching.

### 2. Suppress query invalidation during active wave execution

**File:** `src/hooks/cogniblend/useCurationPageOrchestrator.ts`

In the `saveSectionMutation.onSuccess` handler, skip the `invalidateQueries` call when a wave is actively running. The data will be re-fetched naturally when the wave completes via the `onAllComplete` callback.

Add a `waveRunningRef` (updated from wave setup) and check it:

```
onSuccess: () => {
  if (!waveRunningRef.current) {
    queryClient.invalidateQueries({ queryKey: ['curation-review', challengeId] });
  }
  setSavingSection(false);
},
```

Then add a single `invalidateQueries` call in the `onAllComplete` progress callback so the data refreshes once after all waves finish.

## Files to Change

| File | Change |
|------|--------|
| `src/pages/cogniblend/CurationReviewPage.tsx` | Guard loading skeleton with `!o.isWaveRunning` |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Add `waveRunningRef`, suppress invalidation during waves |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Expose `isWaveRunning` (already computed on line 140) — no change needed, already returned |

## No Database Changes

This is a client-side state management fix only.

