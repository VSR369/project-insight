

# Plan — Synchronous mutex to prevent concurrent Pass 3 / Organize mutations

## Root cause (confirmed)

`useLcPass3Regenerate.ts` relies on React-state `isPending` flags to disable buttons. Because `isPending` only flips on the next render frame, a fast double-click (or near-simultaneous click on the two adjacent buttons) can fire **both** `runPass3.mutate()` and `organizePass3.mutate()` in the same event-loop tick. The existing `useEffect` at line 173 only **logs** the collision — it never cancels anything. Server outcome: Organize finishes first and writes `ai_review_status='organized'`; Pass 3 finishes second, **deletes** that row, and writes `ai_review_status='ai_suggested'`. Organize's work is silently lost.

## Fix — `useRef` mutex (synchronous) + reset on collision (belt-and-braces)

A single file changes: **`src/hooks/cogniblend/useLcPass3Regenerate.ts`**.

### 1. Add a synchronous mutex ref

At the top of the hook body, before the mutations:

```ts
const mutexRef = useRef(false);
```

`useRef` updates synchronously — no render cycle needed. The second click in the same tick sees `mutexRef.current === true` and bails out **before** the edge function is invoked.

### 2. Wrap both `mutationFn` bodies with the mutex

For both `runPass3` and `organizePass3`:

```ts
mutationFn: async () => {
  if (!challengeId) throw new Error('Missing challenge id');
  if (mutexRef.current) {
    toast.info('Another operation is already in progress. Please wait.');
    throw new Error('Concurrent mutation blocked by mutex');
  }
  mutexRef.current = true;
  try {
    // …existing body unchanged…
    return { prevHtml };
  } finally {
    mutexRef.current = false;
  }
},
```

The `finally` block guarantees the mutex releases on **success, error, or thrown exception** — no deadlock possible.

### 3. Defensive release on error

Add `mutexRef.current = false;` as the first line of each mutation's `onError` callback. Redundant with `finally`, but safe insurance against any future refactor that moves work outside the `try`.

### 4. Convert the log-only `useEffect` into an active canceller

Replace the existing log-only effect (≈ line 173) with one that resets the Organize mutation if both ever appear pending simultaneously. Pass 3 is the more expensive, more user-impactful operation — preserve it; cancel Organize:

```ts
useEffect(() => {
  if (runPass3.isPending && organizePass3.isPending) {
    logWarning('Pass 3 and organize running simultaneously — cancelling organize', {
      operation: 'pass3_mutex_violation',
      component: 'useLcPass3Regenerate',
    });
    organizePass3.reset();
  }
}, [runPass3.isPending, organizePass3.isPending]);
```

Belt-and-braces only — the mutex should make this branch unreachable, but if it ever does fire, the user sees a clean state instead of two competing edge-function results.

### 5. Imports

Ensure the file imports `useEffect` and `useRef` from `'react'` (the file already imports `useEffect`; add `useRef`).

## Files touched

1. **`src/hooks/cogniblend/useLcPass3Regenerate.ts`** — add `mutexRef`; wrap both `mutationFn` bodies; defensive `onError` release; upgrade the collision `useEffect` from log-only to `organizePass3.reset()`. File stays ≤ 250 lines (R1).

No other files. No DB migration. No edge function change. No new dependency. Buttons, dialog, progress bar, editor body, status strip — all unchanged (verified correct in earlier passes).

## Behaviour after fix

| Scenario | Before | After |
|---|---|---|
| Single click on **Re-organize** | Organize runs, status `organized` ✓ | Same ✓ |
| Single click on **Re-run Pass 3** | Pass 3 runs, status `ai_suggested` ✓ | Same ✓ |
| Same-tick clicks on both buttons | Both fire; Pass 3 overwrites Organize; Organize's work lost | First click wins; second click shows info toast *"Another operation is already in progress. Please wait."*; only the first mutation's result lands |
| Rapid double-click on the same button | Both fire; duplicate work; possible row conflicts | Second invocation blocked by mutex; single edge-function call |
| Click during in-flight mutation from another surface (page button + editor button) | Both can fire if disabled prop hasn't propagated | Mutex blocks the second; user sees the info toast |

## Verification

1. Open the LC workspace; click **Re-organize (No AI)** then immediately click **Re-run AI Pass 3** within the same animation frame → only Organize runs; second click shows *"Another operation is already in progress…"*; DB row ends with `ai_review_status='organized'`; edge function logs show ONE invocation.
2. Reverse: click Pass 3 then Organize within the same frame → only Pass 3 runs; same toast; DB row ends `ai_review_status='ai_suggested'`; edge logs show ONE invocation.
3. Single clicks on either button work normally with no toast and correct status.
4. Trigger an edge-function error (kill network mid-run) → mutation errors as before; immediately retry → second click is **not** blocked (mutex released by `finally`).
5. Concurrent collision telemetry: confirm `logWarning` with `operation: 'pass3_mutex_violation'` is emitted only in the impossible-but-defensive path (should not appear in normal usage).
6. `npx tsc --noEmit` passes; touched file ≤ 250 lines.

## Out of scope

- Changing button layouts, dialogs, or progress UI (already correct).
- Edge function changes (server is correct — bug was purely client concurrency).
- DB migration.
- Persisting highlights across reloads, character-level diff, status renames.

