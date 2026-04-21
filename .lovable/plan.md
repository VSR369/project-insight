

# Plan — Fix the legal-doc side-nav so clicking a section actually scrolls to it

## Root causes (confirmed in code + DB)

I queried the current `UNIFIED_SPA` row for this challenge — the editor HTML correctly contains `<h2>1. Definitions & Interpretation</h2>`, `<h2>2. Engagement Terms</h2>`, … in the same order as `LEGAL_SECTIONS`. So the *content* is fine. The navigation breaks for these reasons:

1. **One-shot, racy tagging.** `Pass3SectionNavWrapper` tags `<h2>` elements with `data-section` on a single 50 ms timer keyed on `unifiedDocHtml.length`. The diff hook calls `editor.commands.setContent(annotated, { emitUpdate: false })` *after* that timer fires (and again on every Re-organize / Re-run / Clear). ProseMirror rebuilds the DOM and the `data-section` attributes are wiped → subsequent clicks call `containerRef.current.querySelector('[data-section="engagement"]')` → returns `null` → no scroll, no error, silent failure.
2. **Positional index→section mapping is brittle.** Tagging walks H2s in DOM order and pairs index `i` with `LEGAL_SECTIONS[i]`. Any extra H2 inside a trailing `<section class="legal-diff-removed-section">` (or a missing/renamed H2 from an Organize run that produced fewer sections) shifts the entire mapping silently. Some nav items then point to the wrong heading or to none.
3. **No live observation.** Once tags are gone (after a diff swap, after `clearHighlights`, after editor `setEditable` toggles trigger a repaint), nothing re-tags. Subsequent clicks fail forever.
4. **`scrollIntoView` may no-op inside the editor's overflow context.** `EditorContent` mounts a `.ProseMirror` element; the LC workspace puts the editor in a card with constrained overflow. Native `scrollIntoView({ block: 'start' })` works in most browsers, but with `behavior:'smooth'` inside nested overflow containers it can be ignored. Safer to compute the heading's top relative to `window` and call `window.scrollTo({ top, behavior:'smooth' })`.

## Fix — single-file change, tag-by-text + live observer + robust scroll

**File:** `src/components/cogniblend/legal/Pass3SectionNavWrapper.tsx` (full rewrite, stays ≤ 100 lines).

### Behaviour

1. **Tag by text match, not by index.**
   For each `LEGAL_SECTIONS[i]`, scan all H2s under `containerRef.current` and pick the first one whose normalized text matches the section label using the same `looseFingerprint` pattern the diff util uses (lowercase, collapse whitespace, strip leading enumeration like `"1."`, `"1.1"`, `"Section 4 –"`). This makes the mapping survive AI runs that prepend numbering, drop sections, or add an extra H2 in the removed-section panel.
   - H2s inside `.legal-diff-removed-section` are excluded from the scan (those are *removed* clauses, not real sections).
   - If a section label doesn't find a match, the corresponding nav item still renders but `onSectionChange` short-circuits with a quiet `toast.info("This section isn't present in the current draft.")` instead of doing nothing.
2. **Re-tag whenever the editor DOM changes.**
   - Replace the one-shot `setTimeout` with a `MutationObserver` on `containerRef.current` watching `childList` + `subtree`.
   - Debounce re-tagging to ~30 ms (rAF coalesced) so a burst of TipTap mutations triggers at most one re-tag.
   - Also re-run on `contentKey` change (kept as a hint for the very first render before the observer attaches).
   - Disconnect the observer on unmount.
3. **Robust scroll.**
   - Look up the tagged element. If not found, fall back to the text-match scan once more (in case the observer hasn't fired yet) before giving up.
   - Compute target `top = el.getBoundingClientRect().top + window.scrollY - 88` (88 px ≈ sticky header offset; defined as a local `SCROLL_OFFSET_PX` constant) and call `window.scrollTo({ top, behavior:'smooth' })`. Falls back to `el.scrollIntoView({ block:'start' })` if `window.scrollTo` is unavailable.
   - Update `activeSection` only after we know the element exists; otherwise leave the previous active state.
4. **Active-section tracking on scroll.** Add a lightweight `IntersectionObserver` on the tagged H2s with `rootMargin: '-100px 0px -60% 0px'`. As the user scrolls the document, the side nav highlights the section currently at the top of the viewport. Disconnect on unmount and re-attach on re-tag.
5. **Status logic unchanged.** Per-section `LegalSectionStatus` continues to come from `isAccepted` (`approved` vs `ai_modified`).

### Code shape (sketch — final file ≈ 95 lines)

```ts
const SCROLL_OFFSET_PX = 88;

function normalize(text: string): string { /* same as looseFingerprint */ }

function tagHeadings(root: HTMLElement): Map<string, HTMLElement> {
  const found = new Map<string, HTMLElement>();
  const allH2 = Array.from(root.querySelectorAll('h2')).filter(
    (h) => !h.closest('.legal-diff-removed-section'),
  );
  for (const section of LEGAL_SECTIONS) {
    const target = normalize(section.label);
    const match = allH2.find((h) => normalize(h.textContent ?? '').includes(target));
    if (match) {
      match.setAttribute('data-section', section.id);
      found.set(section.id, match as HTMLElement);
    }
  }
  return found;
}
```

`useEffect` wires the `MutationObserver` (debounced via `requestAnimationFrame`) and the `IntersectionObserver` together; both rebuild from the latest `tagHeadings` result.

## Files touched

| File | Change |
|---|---|
| `src/components/cogniblend/legal/Pass3SectionNavWrapper.tsx` | Replace one-shot positional tagging with text-match tagging + MutationObserver + IntersectionObserver + robust window-scroll; quiet toast for missing sections |

No DB / migration / edge-function changes. No other components touched (the wrapper's public props stay the same). File stays ≤ 250 lines (target ≈ 95).

## Verification

1. Reload `/cogni/challenges/25ca71a0-…/lc-legal`. Without clicking anything, DevTools: `document.querySelectorAll('[data-section]')` returns an element for every section that exists in the current draft (10–11 for the current row).
2. Click **2. Engagement Terms** in the side nav → page smooth-scrolls so the "2. Engagement Terms" H2 is just below the sticky header. Repeat for sections 3–11.
3. Click **Re-organize** (or **Re-run AI Pass 3**) → editor content swaps → click any section → still scrolls (proves the MutationObserver re-tagged after `setContent`).
4. Click **Clear** highlights → click any section → still scrolls (proves re-tag survives the clear path).
5. Scroll the document manually — the active side-nav item updates as different sections enter the viewport.
6. If the AI ever produces a draft missing a section (e.g., placeholder removed), clicking that section shows a quiet toast and leaves the active item unchanged instead of failing silently.
7. `npx tsc --noEmit` passes; `Pass3SectionNavWrapper.tsx` ≤ 100 lines.

## Out of scope

- Restructuring section IDs / labels.
- Replacing the side-nav component (`LegalDocSectionNav`) — its API is unchanged.
- Cross-document section navigation (only the unified SPA is in scope).

