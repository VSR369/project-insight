
## Master Health Check-Up & Stabilization Plan (Performance + Header + Dashboard/Continue)

### What we are solving (as stated)
1) **Hanging / performance**: pages take too long or never settle  
2) **Pulse header intermittently missing** across feed pages  
3) **Dashboard “Continue” broken** (critical onboarding flow regression)  
Constraint: Fixes must be **fool-proof**, **keep original functionality**, and **must not break other modules**.

---

## Key findings from codebase review (likely root causes)

### A) Portal redirect on login is doing extra + potentially slow DB work (affects perceived “blank/hanging”)
File: `src/components/routing/RoleBasedRedirect.tsx`

Current behavior:
- It fetches `solution_providers` once (`providerResult`)
- Then **fetches `solution_providers` again** inside the enrollments query expression:
  ```ts
  supabase
    .from('provider_industry_enrollments')
    .select('id')
    .eq('provider_id', (await supabase.from('solution_providers')... ).data?.id || '')
  ```
Problems:
- That nested `await` inside `Promise.all([...])` defeats the “parallelism” and adds extra round trips.
- When provider doesn’t exist, it queries enrollments with `provider_id = ''` (wasted call, can be slow depending on RLS/plan).
- This all happens at the root route and can create a “blank/hanging” feeling right after login before the user reaches Pulse.

Impact:
- Slower time-to-first-route after login.
- More congestion (extra API calls) after retrofit.

### B) Pulse feed queries can produce cache collisions + unnecessary load
File: `src/hooks/queries/usePulseContent.ts`

Good:
- `usePulseFeed()` now uses primitives in the queryKey, which prevents the “object reference refetch storm.”

Remaining issues:
- Query key does **not include** `providerId`, `industrySegmentId`, or `tagId`.
  ```ts
  queryKey: [PULSE_QUERY_KEYS.feed, contentType ?? 'all', limit, offset]
  ```
  This can cause:
  - Wrong cached data being reused across different filters/pages
  - Pages appearing “empty” or showing stale/incorrect results depending on navigation order
- The query currently uses `select('*', ...)` which increases payload size and parse time (against your “Never SELECT *” performance rule).
- Feed polling is **not visibility-aware** in `usePulseFeed` (unlike `useUnifiedPulseFeed`), so background tabs still poll.
- `tagId` exists in filters but is not applied (functional bug).

Impact:
- “Empty feeds” on Sparks/Reels/etc can happen via cache collisions.
- Overall performance suffers due to large payloads + unnecessary polling.

### C) “Header missing” is most consistent with “route never reaches stable render”
Given `PulseHeader` is `fixed` with `z-50`, if it’s missing consistently, the most probable causes are:
- The app is stuck in a parent loading/redirect state (AuthGuard/RoleBasedRedirect)
- A runtime error occurs before `PulseLayout` mounts (React error boundary fallback or render crash)
- Heavy refetching/slow queries keep the UI in a “blank/partial” state

We cannot confirm the exact runtime error from the provided logs (no current errors surfaced), so we’ll add targeted, non-noisy diagnostics (project-standard logging) during implementation.

### D) Dashboard “Continue” can break when EnrollmentContext is treated as optional and setters become no-ops
File: `src/pages/Dashboard.tsx`

Current pattern:
- Uses `useOptionalEnrollmentContext()`
- Falls back to `setActiveEnrollment ?? (() => {})`
If EnrollmentContext is ever temporarily unavailable (during error recovery, HMR, or mounting edge cases), “Continue” can:
- Navigate without a correctly set enrollment
- Route guards then bounce/loop or land the user in the wrong step

Impact:
- Critical onboarding flow can be broken without obvious errors.

---

## Solution design (fool-proof + minimal blast radius)

### Phase 0 — Establish a repeatable “health check” protocol (so we stop guessing)
Deliverable: a deterministic checklist + instrumentation so we can prove “fixed”.

1) Add a **Pulse + Dashboard smoke route** (or extend existing `SmokeTestPage`/`RegressionTestPage`) that:
   - Loads current provider
   - Loads enrollments + active enrollment
   - Loads Pulse unified feed
   - Loads a filtered feed (spark)
   - Displays timings (start/end timestamps) and any fetch errors
2) Add a **global unhandled promise rejection safety net** (per your provided “Lovable Stack Overflow” guidance), but implemented using your structured error handler approach (no raw console logging in production).

Why this matters:
- It turns “blank screen” into actionable errors + correlation IDs.

---

### Phase 1 — Fix login redirect congestion (large perceived performance win, very low risk)
File: `src/components/routing/RoleBasedRedirect.tsx`

Changes:
1) Fetch provider once, reuse it:
   - Use `providerResult.data?.id` for enrollment lookup.
2) Only query enrollments if provider exists:
   - If no provider, skip enrollments query entirely.
3) Reduce DB calls and remove nested awaits inside `Promise.all`.

Acceptance criteria:
- After login, redirect completes quickly and reliably.
- Network shows fewer Supabase calls on landing.

---

### Phase 2 — Make Pulse feeds correct + fast (stop cache collisions, reduce payload, reduce polling)
File: `src/hooks/queries/usePulseContent.ts`

Changes:
1) **Fix queryKey to include all filters that affect results**:
   - `contentType`, `providerId`, `industrySegmentId`, `tagId`, `limit`, `offset`
2) Replace `select('*', ...)` with an explicit column list aligned with what feed cards actually render:
   - `id, provider_id, content_type, content_status, created_at, caption, title, headline, key_insight, body_text, media_urls, cover_image_url, duration_seconds, fire_count, comment_count, gold_count, save_count` plus joined provider/industry/tags
3) Implement the missing `tagId` filter by joining on `pulse_content_tags` (depending on schema patterns already used elsewhere):
   - If join filtering is tricky in PostgREST, use a two-step approach:
     - fetch content_ids by tag
     - query pulse_content with `.in('id', ids)` in safe batches (avoid URL limits per your own standards)
4) Make polling visibility-aware (match `useUnifiedPulseFeed`):
   - `const refetchInterval = useVisibilityPollingInterval(PULSE_POLLING_INTERVALS.FEED_MS);`
5) Ensure filtered pages and unified feed don’t “double poll” the same data unnecessarily:
   - Keep polling on the active page’s query only; ensure other widgets aren’t polling redundant feeds.

Acceptance criteria:
- Sparks/Reels/Podcasts/Articles/Gallery no longer show empty due to cache mismatch.
- Feed requests are smaller (no `*`) and faster.
- Background tabs do not poll.

---

### Phase 3 — Restore Dashboard “Continue” reliability (without reintroducing prior crashes)
File: `src/pages/Dashboard.tsx`

Changes:
1) Stop using no-op setters for critical flows:
   - If EnrollmentContext is unexpectedly missing, render a controlled fallback:
     - show loading UI
     - log a structured warning with correlation ID
     - provide a “Reload” button
2) Prefer a “context must exist on dashboard” model:
   - Since `App.tsx` wraps protected routes in `<EnrollmentProvider>`, Dashboard should assume context is present.
   - We’ll implement a robust fallback for rare recovery edge cases, but we will not silently proceed without context.

Acceptance criteria:
- Clicking “Continue Setup” always routes to the correct step.
- EnrollmentRequiredGuard no longer gets stuck due to missing active enrollment when it should exist.

---

### Phase 4 — Pulse header “always visible” hardening
Files:
- `src/components/pulse/layout/PulseLayout.tsx`
- `src/components/pulse/layout/PulseHeader.tsx`
- Possibly route wrappers / global layout if needed after diagnostics

Changes:
1) Confirm no parent container is clipping the fixed header:
   - Ensure no ancestor applies a transform/backdrop context that breaks fixed positioning.
2) Verify `PulseLayout` always includes header, and `pt-14`/`top` offsets are consistent across all Pulse routes.
3) If blank pages are caused by errors during header render (e.g., notification hook failing), make header resilient:
   - If providerId is missing, `useUnreadNotificationCount` should be `enabled: !!providerId` to avoid errors or wasted queries.

Acceptance criteria:
- Header appears immediately on all `/pulse/*` routes after login, every time.

---

### Phase 5 — End-to-end verification (Pulse + Dashboard + regression check)
We will execute a full E2E manual verification in Preview:

#### 5.1 Login → redirect → Pulse
- Login → land on `/pulse/feed` quickly
- Header present immediately
- Feed loads within ~2 seconds perceived time (skeleton acceptable)

#### 5.2 Pulse primary pages
- `/pulse/feed`
- `/pulse/sparks`
- `/pulse/reels`
- `/pulse/podcasts`
- `/pulse/articles`
- `/pulse/gallery`
- `/pulse/cards`
- `/pulse/ranks`
- `/pulse/profile`
All must:
- render header immediately
- show skeleton → content or empty state
- not hang

#### 5.3 Pulse CRUD smoke
- Create Spark (or Quick Post if easier)
- Confirm it appears in `/pulse/feed` and its filtered page
- Delete (admin if applicable) and confirm it disappears
- Open detail page `/pulse/content/:id` and confirm comments/engagement UI loads

#### 5.4 Dashboard critical flow
- `/dashboard` loads
- “Continue Setup” routes to correct enrollment step
- Enrollment wizard guarded pages load (no redirect loop, no infinite spinner)

#### 5.5 Non-Pulse regression sanity
- Open at least one admin page (if role exists) to ensure lazy route fallback still works
- Confirm AuthGuard behavior unchanged

Deliverable:
- A written checklist outcome (“pass/fail”) plus any remaining fixes.

---

## Implementation sequencing (to minimize risk)
1) Fix RoleBasedRedirect congestion (Phase 1)  
2) Fix usePulseFeed correctness/performance (Phase 2)  
3) Fix Dashboard continue robustness (Phase 3)  
4) Harden PulseHeader enabled-queries + layout edge cases (Phase 4)  
5) Run full E2E checklist (Phase 5)  

---

## Risk controls (do not break other functionality)
- Changes are localized to:
  - RoleBasedRedirect (root routing only)
  - Pulse query hooks + Pulse layout/header
  - Dashboard (provider portal only)
- No database schema changes.
- No changes to EnrollmentRequiredGuard behavior unless diagnostics prove it is still contributing.
- No new dependencies.

---

## Open questions (small but important)
To make the health check “fool-proof,” we need one quick clarification:
1) When “Continue Setup” is broken, what happens?
   - A) nothing happens on click
   - B) it navigates but lands on the wrong wizard step
   - C) it navigates then redirects back to dashboard
   - D) it shows an infinite spinner

If you pick A/B/C/D, I’ll tune Phase 3 to the exact failure mode (even though the robustness changes above will already improve it).

---

## Definition of Done (measurable)
- No Pulse primary page ever shows a blank screen after login.
- Pulse header is visible on every `/pulse/*` route within 200ms of navigation.
- No repeated request storms in network panel (steady polling only; paused when hidden).
- Dashboard “Continue Setup” works for first-time and returning users, every time.
