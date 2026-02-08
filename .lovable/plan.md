
## What’s actually happening (based on evidence we can see)
- Your report is: Pulse header is **always missing** on `/pulse/*` pages, which blocks “Build Profile” / navigation back to dashboard.
- Code inspection shows `PulseLayout` **does** always render `<PulseHeader />` and `PulseHeader` itself always renders a `<header …>`.
- That means the failure is not “missing render call” in code. It’s either:
  1) The header is being **clipped/hidden** by a layout/scrolling/overflow stacking-context issue in the real preview environment, or  
  2) A **runtime render failure** occurs in `PulseHeader` (or its dependencies) in your environment (but without surfacing logs to us right now), or  
  3) A **layout-level overlay** is covering the top region (header exists but is not visible/clickable).

Given you’ve already tried both `fixed` and `sticky-in-flex`, and you still see “no header at all”, this is a classic “CSS containment / stacking context / overflow clipping” issue. The only truly robust approach is to decouple the header from the layout tree.

---

## 5 Whys (root-cause analysis)
1. **Why can’t you navigate to dashboard / build profile?**  
   Because the Pulse header row (dashboard exit + actions) is not visible on Pulse pages.

2. **Why is the Pulse header not visible even though `PulseLayout` renders it?**  
   Because the header is being **hidden at the browser rendering/layout level** (clipped/overlaid) or failing to paint due to stacking context behavior.

3. **Why would it be clipped/overlaid?**  
   Pulse pages use nested scroll containers (`overflow-auto`, `overflow-y-auto`, sticky sidebars, sticky quick nav). In some embedded/preview contexts, these create stacking contexts that can cause “top-of-viewport” elements to not appear as expected or be covered.

4. **Why did switching `fixed` → `sticky` not solve it permanently?**  
   `sticky` depends on scroll containers and their overflow behavior; `fixed` depends on the nearest containing block (which can be altered by transforms/containment). In complex nested layouts, either can fail across environments.

5. **Why is this recurring across iterations?**  
   Because the implementation still relies on header positioning **inside** the same layout subtree that is continuously changing (retrofit/performance/scroll changes). We need a solution that is **insulated** from those layout changes.

**Root cause:** The Pulse header is coupled to a complex nested scroll/overflow layout and therefore is not reliably paintable/clickable across your preview environment.

---

## Permanent fix (fool-proof approach)
### Core strategy: render PulseHeader via a Portal (fixed to `document.body`)
Instead of relying on `sticky` or `fixed` within the Pulse layout tree, we will:
- Render a **portal-based** Pulse header into `document.body` (or a dedicated `#pulse-header-root`).
- Use `position: fixed; top: 0; left: 0; right: 0; z-index: very high`.
- Add a **layout spacer** so page content starts below the header (e.g., `padding-top: var(--pulse-header-height)`).

This avoids all clipping/overflow/stacking-context issues inside the page layout and is the most stable solution for iframe/editor contexts.

### Defense-in-depth: add a “Build Profile / Dashboard” fallback action in QuickNav and/or bottom nav
Even after portalizing the header, we’ll add redundancy so navigation is never blocked again:
- Add a small “Dashboard” item to `PulseQuickNav` (desktop).
- Add a “Dashboard” option in the bottom nav overflow / user menu (mobile/tablet).
This ensures that even if the header ever fails again, you still have an exit.

---

## Implementation details (what I will change)
### 1) Create a dedicated `PulseHeaderPortal` wrapper component
- New file: `src/components/pulse/layout/PulseHeaderPortal.tsx`
  - Uses `createPortal` to render `<PulseHeader … />` into `document.body`
  - Sets `style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000 }}` (or Tailwind `fixed inset-x-0 top-0 z-[1000]`)
  - Measures header height and sets CSS variable `--pulse-header-height` on `document.documentElement`
  - Handles SSR safety (guard against `typeof window === 'undefined'`)

### 2) Update `PulseLayout.tsx` to use the portal header and a spacer
- Replace the inline header render with:
  - `<PulseHeaderPortal … />`
  - a spacer div: `<div style={{ height: 'var(--pulse-header-height, 56px)' }} />`
- Remove any header-related sticky logic that can conflict.
- Keep the rest of layout unchanged.

### 3) Update `PulseLayoutFirstTime.tsx` similarly
- Use `PulseHeaderFirstTime` via a portal wrapper as well, or reuse the same portal wrapper with a prop.

### 4) Ensure header actions always exist for “Build Profile”
Right now PulseHeader provides “Exit to Dashboard” plus menu items.
To satisfy “Build Profile in header” explicitly, we will:
- Add a visible CTA button in PulseHeader (desktop + mobile) when profile is incomplete:
  - Label: “Build Profile”
  - Action: navigate `/dashboard` (or `/enroll/registration` depending on your product flow)
- This CTA should be guarded by provider profile completion percent if available; if not available, show “Dashboard” CTA.

### 5) Add redundant dashboard navigation (non-negotiable resilience)
- `src/components/pulse/layout/PulseQuickNav.tsx`: add item `{ path: '/dashboard', label: 'Dashboard' }` (desktop)
- `src/components/pulse/layout/PulseBottomNav.tsx`: add a 6th item only if design allows, or add an overflow menu / long-press to open dashboard (preferred: add to user avatar menu already exists in header; but redundancy requires at least one non-header control too).

### 6) Add targeted diagnostics (short-term; removable later)
To stop “silent failures”, we’ll add:
- A `data-testid="pulse-header"` on the header container
- A one-time `logWarning` via your structured logger if portal mounting fails (e.g., document not available)
This is minimal and aligned with your “fail loudly” standard.

---

## Verification (end-to-end and measurable)
### Must-pass checks (desktop + mobile + tablet)
1) Login → navigate to `/pulse/feed`
   - Header is visible within 200ms
   - Dashboard exit + “Build Profile” CTA visible
2) Navigate to:
   - `/pulse/reels`, `/pulse/podcasts`, `/pulse/sparks`, `/pulse/articles`, `/pulse/gallery`, `/pulse/cards`
   - Header remains visible and clickable
3) Scroll:
   - Content scrolls under header; header stays fixed
   - No overlap with QuickNav; QuickNav sits below header
4) Click “Build Profile”
   - Goes to `/dashboard` (or correct onboarding route)
5) Regression:
   - Enrollment wizard pages unchanged (they do not use Pulse layout)
   - No new layout shifts / no horizontal overflow at breakpoints

---

## Why this is “fool-proof”
- Portal + fixed-to-body removes the header from the nested overflow/sticky stacking contexts that keep breaking it.
- Spacer uses a measured height so content never sits behind the header.
- Redundant dashboard navigation ensures a single UI component failure can’t block the core flow again.

---

## Files expected to be changed/added
- Add: `src/components/pulse/layout/PulseHeaderPortal.tsx` (new)
- Edit: `src/components/pulse/layout/PulseLayout.tsx`
- Edit: `src/components/pulse/layout/PulseLayoutFirstTime.tsx`
- Edit: `src/components/pulse/layout/PulseHeader.tsx` (add “Build Profile” CTA + testid)
- Edit: `src/components/pulse/layout/PulseQuickNav.tsx` (redundant Dashboard link)
- (Optional) Edit: `src/components/pulse/layout/PulseBottomNav.tsx` (additional redundancy)

---

## Rollback plan (if needed)
- Portal wrapper is isolated. If anything unexpected happens, we can revert PulseLayout to inline header rendering in one commit.
- Redundant Dashboard link can remain regardless (it’s additive and safe).

