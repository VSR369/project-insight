
## Goal
Restore Pulse feed usability and performance:
- Pulse header always visible on Pulse pages
- Main feed renders quickly (no 15s+ stalls)
- Stop unnecessary refetch/re-render loops that “screw up” the feed UI

## What I found (root causes)
### 1) React Query key instability in `useUnifiedPulseFeed` (major performance bug)
In `src/hooks/queries/useUnifiedPulseFeed.ts`, the hook signature uses a default object:
```ts
export function useUnifiedPulseFeed(filters: UnifiedFeedFilters = {}) { ... }
```
And the query key includes that object:
```ts
queryKey: [PULSE_QUERY_KEYS.feed, 'unified', filters],
```
When the caller does `useUnifiedPulseFeed()` (no argument), `filters` becomes a new `{}` on every render. That changes the query key every render, which can cause:
- repeated refetching (network spam)
- perpetual “loading/refetching” state
- slow screens and UI instability

This aligns with “taking more than 15 seconds” and “feed completely messed up”.

### 2) Pulse feed blocks UI on “first time provider” loading
In `src/pages/pulse/PulseFeedPage.tsx`, there is an early return:
```tsx
if (firstTimeLoading && !loadingTimedOut) return (...) 
```
Even though it returns a `PulseLayout`, it still delays the normal feed render until provider/enrollment context settles. If any enrollment/provider query is slow, the page feels “broken”.

### 3) “Header missing” is consistent with long guard/loading states
Your Pulse header (`src/components/pulse/layout/PulseHeader.tsx`) is fixed and should always display inside `PulseLayout`.
If the UI is stuck in a long loading loop (AuthGuard loading, repeated feed query churn, or firstTimeLoading gate), users effectively experience “no header” because the main page never reaches stable render.

## Implementation approach (what I will change)
### A) Fix query key stability in `useUnifiedPulseFeed` (primary fix)
Update `useUnifiedPulseFeed` to ensure the query key is based only on stable primitives:
- Use `limit` and `offset` in the key (not the raw object reference)
- Optionally normalize filters into a stable object inside the hook

Concrete changes:
1. Replace:
   - `queryKey: [PULSE_QUERY_KEYS.feed, 'unified', filters]`
2. With something stable like:
   - `queryKey: [PULSE_QUERY_KEYS.feed, 'unified', { limit, offset }]`
   or
   - `queryKey: [PULSE_QUERY_KEYS.feed, 'unified', limit, offset]`

This alone should stop re-fetch loops and dramatically improve load time.

### B) Make PulseFeedPage render the layout + header immediately
Refactor `PulseFeedPage.tsx` so it does not “return early” for `firstTimeLoading`.
Instead:
- Always render `<PulseLayout ...>`
- Inside it, render a lightweight loading placeholder for the parts that depend on provider/enrollment context (banners, personalized header), while allowing the feed shell/header to appear immediately.

Concrete changes:
- Remove/replace the early return block:
  ```tsx
  if (firstTimeLoading && !loadingTimedOut) { return <PulseLayout ...>...</PulseLayout>; }
  ```
- Replace with “inline gating” inside the normal render:
  - Show `ProfileBuildBanner` / `StartPostWidget` / `PersonalizedFeedHeader` only when provider is available
  - Show a smaller skeleton section for those widgets while provider is loading
  - Allow the feed list section to proceed based on `useUnifiedPulseFeed` loading state

### C) Add lightweight performance diagnostics (dev-only) to confirm fix
To prevent regressions, I will add guarded diagnostics (no noisy console in prod):
- Use existing structured logging utilities if appropriate, or keep to minimal `logInfo/logWarning` style (per your standards)
- Track:
  - how many times `useUnifiedPulseFeed` fetch runs within 10 seconds
  - whether query key changes unexpectedly

(If you prefer zero logging changes, I’ll skip this and rely on network panel behavior + observable UI speed.)

## Files to edit
1. `src/hooks/queries/useUnifiedPulseFeed.ts`
   - Fix unstable query key
   - Ensure pagination params drive caching correctly
2. `src/pages/pulse/PulseFeedPage.tsx`
   - Remove early “firstTimeLoading” blocking return
   - Ensure Pulse header/layout always render immediately
   - Keep loading/empty/error states, but without blocking the shell

## Validation checklist (end-to-end)
After implementation, we will verify:
1. Navigate to `/pulse/feed`
   - Header appears immediately (Pulse top bar)
   - Feed shows skeletons briefly, then content
2. Hard refresh `/pulse/feed` (Cmd/Ctrl+Shift+R)
   - No 15s stall
3. Switch between `/pulse/feed` → `/pulse/sparks` → back to `/pulse/feed`
   - No repeated long stalls
4. Check browser network:
   - Feed requests should not spam repeatedly on every render
   - Requests should follow the expected polling interval (visibility-aware polling)
5. Confirm enrollment wizard pages still behave (sanity):
   - `/enroll/participation-mode` redirects only when contextReady + no active enrollment

## Risks / tradeoffs
- Changing the query key will reset the cache key shape; this is expected and safe (it improves correctness).
- Adjusting PulseFeedPage render flow could slightly change when onboarding widgets appear, but it should improve perceived performance and stability without changing business logic.

## If the issue persists after A+B
If feed is still slow after stabilizing the query key and removing blocking returns, next likely culprits:
- Over-fetching in provider/enrollment context (multiple dependent queries)
- A heavy component in the feed items (media rendering) causing main-thread stalls
In that case, I will profile which component is slow (feed item rendering vs data fetching) and propose targeted memoization/lazy loading.
