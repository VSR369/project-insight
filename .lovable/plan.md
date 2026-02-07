
## Objective (what “done” means)
1. All Pulse pages load in under ~2 seconds perceived time (header visible immediately; content skeletons allowed).
2. Pulse header is always visible on every `/pulse/*` route after login.
3. Filtered feed pages (Sparks/Reels/Podcasts/Articles/Gallery) never render a “blank” viewport while provider/feed data is loading; they render PulseLayout + header + skeleton/empty states.
4. No regressions to enrollment wizard or other non-Pulse areas.
5. End-to-end verification across Pulse module: Feed, filtered feeds, Cards, Create, Profile, content detail, basic CRUD actions (create/delete/engage/comment where applicable).

---

## What I found from code + logs (why this is happening)
### A) “Blank page + no header” is most consistent with early “full-screen” loading returns
- Your `AuthGuard` returns a full-screen spinner (no header) while `useAuth().loading` is true.
- Several Pulse filtered pages (example: `PulseReelsPage`, `PulseSparksPage`) return early when **either** `isLoading` (feed) OR `providerLoading` is true:
  ```ts
  if (isLoading || providerLoading) {
    return (
      <PulseLayout ...>
        <Skeleton ... />
      </PulseLayout>
    );
  }
  ```
  This should still show the Pulse header, but if the page is *actually* in `AuthGuard`’s loading state (or an error boundary fallback), you will get “no header” and a “blank-ish” screen.

### B) Main unified feed query-key instability is already fixed, but filtered feeds use a different hook (`usePulseFeed`)
- Your unified feed hook is now stable (`queryKey` uses primitives). Good.
- The filtered feed pages use `usePulseFeed({ contentType: 'spark' | 'reel' ... })`. If `usePulseFeed` uses an object in its query key (similar issue to what we fixed in `useUnifiedPulseFeed`), it can cause refetch storms / stuck loading / “pathetic performance”.
- We have not yet inspected `src/hooks/queries/usePulseContent.ts` (which defines `usePulseFeed`)—this is a high-probability root cause.

### C) You have a persistent React warning about refs
Console warning:
> Function components cannot be given refs… Check the render method of `App`… at PulseReelsPage … at PulseLayout …
This usually comes from some wrapper component passing a `ref` to a function component that does not `forwardRef`. While warnings don’t always break UI, in practice they often correlate with unstable rendering wrappers and can contribute to “weird blank states” when combined with error boundaries.

---

## Implementation plan (exact changes I will make)

### Phase 1 — Make Pulse pages “shell-first” (header never blocked by page-level loading)
**Goal:** Never “return early” in Pulse pages in a way that can prevent the header from mounting quickly.

#### 1.1 Refactor each filtered feed page to always render `<PulseLayout …>` immediately
Files:
- `src/pages/pulse/PulseSparksPage.tsx`
- `src/pages/pulse/PulseReelsPage.tsx`
- `src/pages/pulse/PulsePodcastsPage.tsx`
- `src/pages/pulse/PulseArticlesPage.tsx`
- `src/pages/pulse/PulseGalleryPage.tsx`

Change pattern:
- Remove the early:
  ```ts
  if (isLoading || providerLoading) return <PulseLayout>…</PulseLayout>
  ```
- Replace with:
  - Always return `<PulseLayout …>` (so header mounts immediately)
  - Inside, render:
    - Profile banner skeleton if `providerLoading`
    - Feed skeleton if `isLoading`
    - Empty state if loaded and no items
    - Content list otherwise

This matches what we already did for `PulseFeedPage` and makes the behavior consistent.

#### 1.2 Standardize header mode for filtered pages
- Use `PulseLayout isPrimaryPage` on these pages (instead of `title="..."`) so the header renders in “primary mode” consistently (dashboard exit + Pulse branding) and we don’t rely on legacy title logic.
- If you still want “Sparks/Reels/…” visible in the header, we’ll use the modern breadcrumb pattern:
  - `breadcrumb: { parentLabel: 'Pulse', parentPath: '/pulse/feed', currentLabel: 'Sparks' }`
  - This ensures the header always has meaningful context and uses the stable back logic.

This will also reduce confusion when users say “header missing”—because even if the content is loading, the header will be clearly visible and consistent.

---

### Phase 2 — Fix the real performance problem in filtered feed hooks (`usePulseFeed`)
**Goal:** Stop any remaining refetch storms / stuck loads by ensuring query keys are stable and requests are minimal.

#### 2.1 Inspect and fix `usePulseFeed` queryKey stability
File to inspect and likely modify:
- `src/hooks/queries/usePulseContent.ts` (contains `usePulseFeed`)

What I will do:
- If it accepts params like `{ contentType }` and uses that object in `queryKey`, I’ll refactor to primitives:
  - Extract `contentType`, `limit`, `offset` to primitives.
  - Use queryKey like:
    - `['pulse_feed', contentType, limit, offset]` (or your existing `PULSE_QUERY_KEYS` scheme)
- Ensure `enabled` uses primitives and doesn’t re-run unnecessarily.

#### 2.2 Align caching with your global React Query defaults
- For filtered feeds (semi-dynamic), use:
  - `staleTime: 10s` (or 30s if acceptable)
  - `refetchInterval: useVisibilityPollingInterval(PULSE_POLLING_INTERVALS.FEED_MS)`
- Ensure we are not “double polling” (multiple components polling the same query under different keys).

---

### Phase 3 — Eliminate the ref warning (reduce render instability)
**Goal:** Remove the “function components cannot be given refs” warning that’s appearing in Pulse page stacks.

Steps:
1. Identify the exact component receiving the bad ref:
   - It’s being reported around `PulseReelsPage` / `PulseLayout`.
2. Search for places where Pulse pages/layout are being passed into a component that forwards refs (common suspects):
   - Radix `Slot`
   - `asChild` patterns
   - Animated wrappers
   - Any custom “PageContainer” or layout wrapper that does `cloneElement(child, { ref: ... })`
3. Fix approach:
   - If it’s a wrapper expecting a DOM node, change it to wrap a `<div>` and put PulseLayout inside, rather than attaching ref to PulseLayout/page component.
   - If a component must accept refs, convert that component to `React.forwardRef`.

Deliverable: zero occurrences of that warning in console on Pulse routes.

---

### Phase 4 — End-to-end Pulse module verification (fool-proofing)
**Goal:** Confirm that everything works after login with realistic user actions, and we did not break other modules.

#### 4.1 Create a “Pulse E2E Checklist” and execute it manually in Preview
Test matrix (after login):
1. `/pulse/feed`
   - header visible immediately
   - feed populates
   - refresh button works
   - delete (admin) works
2. `/pulse/sparks`, `/pulse/reels`, `/pulse/podcasts`, `/pulse/articles`, `/pulse/gallery`
   - header visible immediately
   - loading skeleton appears then content OR empty state
   - “Create …” button navigates to `/pulse/create` with correct type state
3. `/pulse/cards`
   - header visible
   - topics load and filter works
4. `/pulse/create`
   - create each type (at least Spark + one media type if possible)
   - verify it appears back in feed
5. `/pulse/profile`
   - page loads; no blank/slow state
6. Regression sanity:
   - `/dashboard` loads
   - click “Continue” to enrollment registration still works
   - one enrollment page behind `EnrollmentRequiredGuard` loads (e.g., `/enroll/participation-mode`)

#### 4.2 Add a lightweight internal Smoke Test page (optional but recommended)
If you want ongoing protection against regressions:
- Add/extend a `PulseSmokeTestPage` that:
  - Calls the key Pulse queries (unified feed, filtered feed, cards topics, provider context)
  - Displays timings and status
This helps catch “slow/blank header” regressions early.

---

## Files expected to change
1. Pulse pages refactor (shell-first rendering)
- `src/pages/pulse/PulseSparksPage.tsx`
- `src/pages/pulse/PulseReelsPage.tsx`
- `src/pages/pulse/PulsePodcastsPage.tsx`
- `src/pages/pulse/PulseArticlesPage.tsx`
- `src/pages/pulse/PulseGalleryPage.tsx`

2. Hook performance fix
- `src/hooks/queries/usePulseContent.ts` (stabilize `usePulseFeed` query key and polling)

3. Ref warning fix (depending on where the ref is coming from)
- One of:
  - a wrapper component used around routes/pages
  - a UI component using `asChild` incorrectly
  - or a component needing `forwardRef`

---

## Risk controls (to avoid breaking other functionality)
- No changes to routing structure in `App.tsx`.
- No changes to EnrollmentContext behavior beyond what’s already done.
- All Pulse fixes will be localized to Pulse pages and Pulse query hooks.
- Any ref-related change will be minimal and validated by removing the warning plus verifying navigation still works.

---

## Acceptance criteria (what you can verify quickly)
- After login, open `/pulse/reels`: header visible immediately; within 1–2 seconds you see either reels or a clear empty state.
- Console has no “function components cannot be given refs” warning.
- Network shows one feed request per page (plus normal polling), not request storms.
- CRUD smoke: Create a Spark; it appears in feed; delete works for admin; comments load in content detail.

