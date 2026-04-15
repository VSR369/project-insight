

# Fix: Wave Execution Stopping After One Wave

## Root Causes Found

### Bug 1: `inFlightRef` never reset on error (PRIMARY)
In `useWaveExecutor.ts`, the `executeWaves` function sets `inFlightRef.current = true` at the start but only resets it to `false` at the very end — with **no try/finally**. If ANY error occurs during the loop (e.g., `buildChallengeContext()` throws, a state updater throws, or an unhandled edge case), the error propagates up, `inFlightRef` stays `true` forever, and every subsequent call to `executeWaves` exits immediately with "A review is already in progress." This is the most likely cause: wave 1 completes, something throws before wave 2 starts, and the executor is permanently locked.

### Bug 2: `waveRunningRef` race condition
The `waveRunningRef` in the orchestrator is synced via `useEffect`, which runs asynchronously after a render. But the wave executor starts processing sections synchronously after calling `setWaveProgress`. The first section's save can complete and trigger `saveSectionMutation.onSuccess` BEFORE the effect runs — at which point `waveRunningRef.current` is still `false`, causing query invalidation → potential page data refetch → the previous unmount bug we tried to fix.

### Bug 3: `reReviewStale` has the same `inFlightRef` bug
Same missing try/finally pattern.

## Fix Strategy

### 1. Add try/finally to `executeWaves` and `reReviewStale` (`useWaveExecutor.ts`)
Wrap the entire execution body in try/finally to guarantee `inFlightRef.current = false` always runs, even on errors.

### 2. Set `waveRunningRef` synchronously before calling executor (`useCurationPageOrchestrator.ts`)
Instead of relying on `useEffect` to sync `waveRunningRef`, set it directly to `true` before calling any execute function. The AI action hooks (`useCurationAIActions.ts`) call `executeWavesPass1()` and `executeWavesPass2()` — we need to set the ref before those calls. Expose a `setWaveRunning` callback from the orchestrator, or better: set `waveRunningRef.current = true` inside the executor options' `onWaveStart` callback (which fires synchronously at the start of the first wave).

### 3. Add error toast when wave loop throws (`useWaveExecutor.ts`)
Currently if the loop throws, the error silently propagates. Add a catch to set `overallStatus: 'error'` and show a toast.

## Files to Change

| File | Change |
|------|--------|
| `src/hooks/useWaveExecutor.ts` | Wrap `executeWaves` and `reReviewStale` bodies in try/finally to always reset `inFlightRef`. Add catch to set error status and show toast. |
| `src/hooks/cogniblend/useCurationPageOrchestrator.ts` | Set `waveRunningRef.current = true` synchronously in `progressCallbacks.onWaveStart` (already fires before any section is reviewed). Keep the `useEffect` as a fallback sync but add the direct ref set. |
| `src/hooks/cogniblend/useCurationWaveSetup.ts` | Pass `waveRunningRef` into the progress callbacks so `onWaveStart` can set it directly. |

## No Database Changes

Client-side state management fix only.

