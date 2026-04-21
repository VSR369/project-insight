

# Plan — Keep the legal-doc side nav visible while scrolling

## Why it scrolls away today

In `LegalDocSectionNav.tsx` the `<nav>` element uses:
```
className="w-[220px] shrink-0 rounded-md border bg-card p-2"
```
No `sticky` / `fixed` positioning. It sits in a normal flex row inside `Pass3EditorBody`, so it scrolls with the page. The flex parent (`flex flex-col gap-4 lg:flex-row`) and the page have no `overflow` clipping ancestors between the nav and the viewport, so `position: sticky` on the nav itself will work cleanly without any wrapper restructuring.

## Fix — single CSS-class change in one file

**File:** `src/components/cogniblend/legal/LegalDocSectionNav.tsx`

Update the `<nav>` className to:
```
"sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto w-[220px] shrink-0 rounded-md border bg-card p-2 hidden lg:block"
```

What each piece does:
- `sticky top-20` — pins the nav 80 px below the viewport top (clears the app's sticky header) once scrolling reaches it; it then stays put as the document scrolls.
- `self-start` — anchors to the top of the flex row instead of stretching, which is required for `sticky` to behave inside a flex container.
- `max-h-[calc(100vh-6rem)] overflow-y-auto` — if the section list ever grows taller than the viewport, the nav itself becomes scrollable instead of being clipped.
- `hidden lg:block` — keeps the existing mobile-friendly layout where on small viewports the nav stacks above the document and shouldn't be sticky (matches the project's `lg:` breakpoint rule).

No other files need to change. The two call sites (`Pass3EditorBody.tsx`, `CuratorLegalReviewPanel.tsx`) already wrap the nav in a `flex flex-col gap-4 lg:flex-row` container, which is the exact layout `position: sticky` needs.

## Files touched

| File | Change |
|---|---|
| `src/components/cogniblend/legal/LegalDocSectionNav.tsx` | Add `sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto hidden lg:block` to the `<nav>` className |

No DB / migration / edge-function / dependency changes. File stays well under 250 lines.

## Verification

1. Reload `/cogni/challenges/25ca71a0-…/lc-legal` on a `≥ lg` viewport. Side nav visible on the left.
2. Scroll the page down through the entire legal document — the nav stays pinned at `top: 80px`, fully visible, while the document scrolls behind it.
3. Click any section in the (now always-visible) nav → smooth-scroll still lands the heading just below the sticky header (existing scroll logic is unchanged).
4. The active-section highlight still updates as you manually scroll, because the IntersectionObserver in `Pass3SectionNavWrapper` is unaffected.
5. Resize to `< lg` — nav reverts to stacking above the document and is not sticky (correct mobile behaviour).
6. `npx tsc --noEmit` passes.

## Out of scope

- Adding a collapsible mobile drawer for the nav.
- Changing the nav's width or visual styling.
- Any change to the scroll/scroll-spy logic in `Pass3SectionNavWrapper`.

