# Fix: React #426 crash after accepting legal document

## Root cause

After clicking **Accept & Continue** on the PWA gate:

1. `useAcceptRoleLegal` insert succeeds → invalidates `pending-role-legal-acceptance`.
2. The refetch returns `[]`, so `RoleLegalGate`'s `useEffect` synchronously calls `onAllAccepted()`.
3. `AuthGuard` flips `roleLegalDone = true` and immediately swaps in `{children}` — which is a `React.lazy()`-loaded route module (Organization Portal). The lazy chunk suspends.
4. `AuthGuard` renders `{children}` directly, with **no `Suspense` boundary of its own**. The suspension happens during a synchronous, non-transition update inside the post-mutation effect chain → React throws **#426** ("update before hydration / suspending sync").

The same gap was previously fixed in `AdminGuard` (it wraps `{children}` in `Suspense`) and recorded in `mem://architecture/auth/guard-stability-and-resilience`. `AuthGuard` was never updated to the same pattern, so it still trips whenever a gate transitions from "blocked" to "render children" in response to a network event (mutation success, refetch).

## Fix

Two small, surgical changes — no behavior change for any other path.

### 1. Wrap `AuthGuard`'s children in `Suspense`

`src/components/auth/AuthGuard.tsx` — replace the final `return <>{children}</>;` with a `Suspense` boundary that uses the same loader the rest of the file already shows during gate checks. This gives React a stable fallback if the children's lazy chunk suspends mid-transition.

### 2. Defer the gate-pass state updates with `startTransition`

In `AuthGuard.tsx`, mark the three "gate cleared" state setters as transitions so React can interrupt them safely when the next render suspends:

- `handleAllAccepted` (PMA)
- `handleRoleLegalDone` (Role Legal — the one in this bug)
- `setSpaAccepted(true)` callback (legacy SPA)

Each becomes `React.startTransition(() => setX(true))`. This pairs with the existing `BrowserRouter future={{ v7_startTransition: true }}` setting in `App.tsx` and matches the documented resilience pattern.

### 3. (Defensive) Defer `onAllAccepted` inside `RoleLegalGate`

In `src/components/auth/RoleLegalGate.tsx`, wrap the `onAllAccepted()` call inside the empty-list `useEffect` in `startTransition` as well. This protects against the same crash if any future caller forgets to wrap their setter.

## Why this is the right fix (not a workaround)

- The `legal_acceptance_log` insert itself is succeeding (constraint bug was already fixed last turn). The pending row is being resolved correctly. Verifiable from the auth log: a fresh token was issued at the moment of click, and no DB error came back.
- The crash is purely a client-side render-timing issue, identical in shape to the previously-fixed `AdminGuard` case. Solving it at the guard layer (Suspense + transition) is the architecturally correct location — every gate that conditionally swaps in lazy children needs this, not just the legal one.
- No DB migration, no RLS change, no edge-function change. Read-only legal acceptance flow stays exactly as designed (Phase 9 v4).

## Files to edit

- `src/components/auth/AuthGuard.tsx` — add `Suspense` wrapper around `{children}`; wrap three state-setter callbacks in `startTransition`.
- `src/components/auth/RoleLegalGate.tsx` — wrap `onAllAccepted()` call in `startTransition` inside the completion `useEffect`.

## Validation after applying

1. Sign in as a workforce-role user with an open PWA pending row.
2. Scroll, check the box, click **Accept & Continue**.
3. Expect: success toast, the gate unmounts, `/org/dashboard` renders, **no error boundary**.
4. Re-login → no PWA gate (acceptance persisted).
5. Re-run existing legal flow (PMA / SPA legacy) to confirm no regression on those paths.
