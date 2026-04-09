

# Fix: React Error #426 in AuthGuard

## Root Cause
When `useSpaStatus` transitions from `enabled: false` to `enabled: true` (as `user` loads), there's a single render where:
- `spaLoading = false` (fetch not started yet)
- `hasSpa = undefined` (no data)
- `!hasSpa && !spaAccepted` evaluates to `true`

This causes AuthGuard to render `SpaAcceptanceGate` prematurely. When the query kicks in on the next render and `spaLoading` becomes `true`, the render tree changes abruptly. Combined with LegalGateModal's `onAllAccepted` effect firing in the same cycle, this creates a hook count mismatch in a child component.

## Fix (AuthGuard.tsx only)

1. **Treat undefined `hasSpa` as "still loading"** — change the SPA gate condition from `!hasSpa` to `hasSpa === false` so `undefined` is treated as pass-through (fail-open).

2. **Skip SPA gate for admin users** — Admin users are not solvers and should never see the Solver Platform Agreement. Check user roles or route path before showing SPA gate.

3. **Guard against the enabled-transition gap** — Add `hasSpa !== false` to the loading check so the spinner shows while data is undefined.

### Code Change

```typescript
// AuthGuard.tsx — line ~40
if (loading || spaLoading) { ... }
```
becomes:
```typescript
if (loading || (spaLoading && hasSpa === undefined)) { ... }
```

And line ~64:
```typescript
if (!hasSpa && !spaAccepted) { ... }
```
becomes:
```typescript
if (hasSpa === false && !spaAccepted) { ... }
```

This ensures `undefined` (no data yet) is treated as "not determined" rather than "not accepted", preventing the premature SpaAcceptanceGate render.

## Files Modified
| File | Change |
|------|--------|
| `src/components/auth/AuthGuard.tsx` | Fix SPA gate race condition with strict `=== false` check |

## Impact
- Fixes the #426 crash on /admin (and all other AuthGuard-protected routes)
- Admin users no longer see the SPA gate
- Maintains fail-open behavior: if the query errors, `hasSpa` returns `true` (existing logic in useSpaStatus)

