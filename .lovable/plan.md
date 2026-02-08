
Goal: Make the Pulse header reliably visible on all Pulse feed screens (/pulse/feed, /pulse/reels, /pulse/podcasts, /pulse/sparks, /pulse/articles, /pulse/gallery, /pulse/cards) without breaking any other navigation, headers, or functionality.

What we now know (from direct inspection)
- When the issue is reproduced, you sometimes see Pulse content but no header (“Pulse content (no header)”).
- Auth persistence is inconsistent (“Sometimes” stays signed in across refresh).
- In the agent’s browser run:
  - When not authenticated, /pulse/sparks shows the Login screen (expected due to AuthGuard).
  - After Quick Login, /pulse/feed shows a visible Pulse top bar (Exit to Dashboard, Pulse, Search, Notifications, initials button).
  - But DOM checks for data-testid="pulse-header-portal" and "pulse-header" returned null even while a header-like UI was visible.
    - This strongly suggests we sometimes end up in a state where the visible “top bar” is not the portal header we expect (or the portal header is being mounted/unmounted in a way that makes it unreliable).
    - Combined with “auth sometimes persists, sometimes not”, the most likely root cause is an auth initialization race that intermittently causes route-level remounts and/or redirects, which can prevent the header portal from stabilizing.

Root cause analysis (5 whys)
1) Why is the header missing on Pulse feed pages?
   - Because the component responsible for rendering it (PulseLayout → PulseHeaderPortal → PulseHeader) is intermittently not present/visible in the final rendered state.

2) Why would PulseLayout be present (content visible) but header not?
   - Because the header is rendered through a portal and depends on correct mount timing + stable DOM target. If the app briefly redirects/remounts due to auth state, the portal can fail to attach or can be removed during cleanup. Also, route-level nested scrolling/stacking contexts can still interfere if the portal target is not consistently used.

3) Why would auth state cause remount/redirect loops intermittently?
   - Current AuthProvider sets loading=false in the onAuthStateChange callback immediately, while also calling getSession asynchronously. In some environments, the initial auth event can be “INITIAL_SESSION” with null, causing AuthGuard to think auth is “done and unauthenticated” and redirect, then shortly after getSession returns a valid session and the app flips back. This produces non-deterministic UI results (especially across refresh/deep links).

4) Why does this show up “sometimes” across refresh?
   - Storage/cookie policies and timing differ per browser/tab/refresh, especially in preview environments and when users switch between Preview URL vs Published URL origins.

5) Root cause
   - The Pulse header visibility bug is driven by a combination of (A) auth initialization race / inconsistent session persistence causing intermittent remount/redirect cycles, and (B) header portal attachment not being anchored to a stable, dedicated DOM node, making it vulnerable during those cycles.

Non-negotiable constraints
- Do not break any existing Pulse navigation (QuickNav, BottomNav), enrollment flows, or other headers/layouts.
- Keep portal-based approach (it’s still the correct strategy), but make it resilient to auth/state and DOM target issues.

Implementation plan (safe, incremental, defense-in-depth)

Phase 1 — Make auth initialization deterministic (prevents intermittent remount/redirect)
1) Update src/hooks/useAuth.tsx to eliminate the “initial session race”:
   - Introduce an internal “initialSessionResolved” flag/ref.
   - On mount:
     a) Call supabase.auth.getSession() first (or concurrently) and ONLY set loading=false after it resolves.
     b) Register onAuthStateChange, but do not allow it to flip loading=false before initial session resolution is complete.
   - Ensure we do not briefly set loading=false with user=null in the middle of startup if a session exists.
   - Preserve current behavior for queryClient.clear() on SIGNED_IN / SIGNED_OUT (keep), but ensure it doesn’t run for INITIAL_SESSION unless truly appropriate.

Expected outcome:
- AuthGuard won’t intermittently redirect away from /pulse/* during startup when a valid session exists.
- PulseLayout mount becomes stable, which is foundational for stable portal header behavior.

Phase 2 — Make the header portal anchor stable and idempotent
2) Update src/components/pulse/layout/PulseHeaderPortal.tsx:
   - Create/use a dedicated portal root element:
     - Ensure a single <div id="pulse-header-root" /> is appended to document.body (create if missing).
     - Render the portal into that node instead of document.body directly.
   - Make portal mounting idempotent across remounts:
     - Do not remove the root element on unmount (or only remove it if created by this instance and no other instance is using it; simplest safe approach: keep it).
   - Use useLayoutEffect for measurement/variable setting so header height is established before paint as much as possible.
   - Add lightweight structured logging (logWarning) only when:
     - window/document unavailable
     - portal root cannot be created
     - ResizeObserver not available (fallback to window resize)

Expected outcome:
- Even if the Pulse route tree remounts, the portal has a stable target and will reattach reliably.

Phase 3 — Add an inline “last resort” fallback without duplicating UX
3) Enhance PulseLayout to provide an inline header fallback when portal is not present:
   - Keep the portal header (primary).
   - Add a tiny runtime check that confirms the portal root contains content after mount; if not, render PulseHeader inline at the top of the layout (as a safety net).
   - This fallback must:
     - be visually identical
     - not render twice (portal + inline simultaneously)
     - be constrained to Pulse routes only (PulseLayout / PulseLayoutFirstTime)

Implementation detail:
- In PulseHeaderPortal, expose a boolean callback/prop like onPortalStatusChange(isActive).
- In PulseLayout, track portalActive state:
  - portalActive=true → render spacer only
  - portalActive=false → render inline header + spacer (or render inline header in-flow and skip spacer)
This avoids duplicate headers and ensures “header always visible” even if portal fails.

Phase 4 — Verify all Pulse feed pages are using PulseLayout and not bypassing it
4) Audit each Pulse feed page (Feed/Reels/Podcasts/Sparks/Articles/Gallery/Cards) for early returns that bypass PulseLayout:
   - Ensure “shell-first pattern” is preserved: PulseLayout should render even on loading/error states.
   - PulseFeedPage already follows this for error; verify others too.
   - Ensure no conditional returns happen before rendering PulseLayout in any of those pages.

Phase 5 — Reproduce + validate across the exact failure modes you described
5) Test scenarios (must pass):
   - While signed in:
     - Navigate across all Pulse tabs repeatedly (Feed → Sparks → Cards → Feed…)
     - Header visible every time; actions work
   - Refresh (F5) on each Pulse route:
     - /pulse/feed, /pulse/sparks, /pulse/cards, etc.
     - If session exists, do not show login and do not lose header
   - Deep link open in a new tab:
     - /pulse/cards directly
   - Sign out from header, then sign back in:
     - Header returns reliably
   - Mobile/tablet breakpoints:
     - header fixed and bottom nav both visible and not overlapping content

Risk controls / “do not break other features”
- All changes are localized to:
  - AuthProvider initialization behavior (useAuth.tsx) — affects entire app but in a controlled way (reduces flicker/redirect races).
  - PulseHeaderPortal and PulseLayout fallback logic — scoped to Pulse module.
- No changes to routing table in App.tsx.
- No changes to QuickNav/BottomNav behavior (they remain redundancy paths).
- No changes to Supabase policies or backend.

Deliverables (files to change)
- src/hooks/useAuth.tsx
  - Deterministic initial session resolution; prevent loading=false too early.
- src/components/pulse/layout/PulseHeaderPortal.tsx
  - Dedicated portal root (#pulse-header-root), idempotent mounting, useLayoutEffect height measurement, robust fallbacks/logging.
- src/components/pulse/layout/PulseLayout.tsx
  - Portal-active detection and inline fallback header rendering (no duplicates).
- src/components/pulse/layout/PulseLayoutFirstTime.tsx
  - Same portal-active + fallback logic for the first-time layout.
- (Audit-only) Pulse feed pages:
  - Confirm no early returns bypass PulseLayout; adjust only if found.

Success criteria (what “fixed” means)
- Header is visible on all Pulse feed screens 100% of the time after navigation and after refresh, as long as the user is authenticated.
- When authentication is lost/expired, the user is redirected to login (expected), and once logged in again, the header appears reliably.
- No double-header rendering; no broken spacing; no new horizontal scroll; no regression in Pulse navigation or enrollment flows.
