/**
 * diffHighlight — clause-level diff annotation for legal documents.
 *
 * Used by the LC Pass 3 panel to mark added AND removed clauses after a
 * Consolidate / Re-run. Block-level (paragraph/list-item/heading)
 * fingerprinting — sufficient for legal review where clauses, not chars,
 * are the meaningful unit.
 *
 * Two visual markers:
 *   - `legal-diff-added`   — wraps inner HTML of newly inserted blocks (red)
 *   - `legal-diff-removed` — re-injected blocks that were dropped (strike)
 *
 * All exports are pure / SSR-safe (DOMParser is browser-only; functions
 * gracefully no-op when `typeof window === 'undefined'`).
 */

const DIFF_ADDED_CLASS = 'legal-diff-added';
const DIFF_REMOVED_CLASS = 'legal-diff-removed';
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td';

function getParser(): DOMParser | null {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return null;
  return new DOMParser();
}

function fingerprint(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function serialize(doc: Document): string {
  return doc.body.innerHTML;
}

function findPrecedingH2(el: Element): Element | null {
  // Walk up + back to find the nearest preceding <h2>.
  let cursor: Element | null = el;
  while (cursor) {
    let sibling: Element | null = cursor.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === 'H2') return sibling;
      sibling = sibling.previousElementSibling;
    }
    cursor = cursor.parentElement;
  }
  return null;
}

function findH2ByText(doc: Document, text: string): Element | null {
  const target = fingerprint(text);
  if (!target) return null;
  const h2s = doc.querySelectorAll('h2');
  for (const h2 of Array.from(h2s)) {
    if (fingerprint(h2.textContent ?? '') === target) return h2;
  }
  return null;
}

/**
 * Compare `prev` and `next`. Mark blocks present in `next` but not in `prev`
 * with `legal-diff-added`, and re-inject blocks present in `prev` but not
 * in `next` as `legal-diff-removed` blocks anchored under the matching
 * `<h2>` section heading (or at the top as fallback).
 *
 * If `prev` is empty, returns `next` unchanged (first generation).
 */
export function annotateDiff(prev: string, next: string): string {
  const parser = getParser();
  if (!parser || !next) return next;
  if (!prev || !prev.trim()) return next;

  const prevDoc = parser.parseFromString(prev, 'text/html');
  const nextDoc = parser.parseFromString(next, 'text/html');

  // Build prev fingerprint → element map (keep first occurrence per fp).
  const prevByFp = new Map<string, Element>();
  prevDoc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (fp && !prevByFp.has(fp)) prevByFp.set(fp, el);
  });

  // Collect next fingerprints.
  const nextFps = new Set<string>();
  nextDoc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (fp) nextFps.add(fp);
  });

  // Mark ADDED blocks in next (not present in prev).
  nextDoc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (!fp) return;
    if (prevByFp.has(fp)) return;
    if (el.querySelector(`span.${DIFF_ADDED_CLASS}`)) return;
    // Skip headings — adding a wrapper inside <h2> looks awkward.
    if (/^H[1-6]$/.test(el.tagName)) {
      el.classList.add(DIFF_ADDED_CLASS);
      return;
    }
    const span = nextDoc.createElement('span');
    span.className = DIFF_ADDED_CLASS;
    span.innerHTML = el.innerHTML;
    el.innerHTML = '';
    el.appendChild(span);
  });

  // Inject REMOVED blocks (in prev but not in next) as struck-through markers,
  // anchored under their original section heading where possible.
  const firstNextBlock = nextDoc.body.querySelector(BLOCK_SELECTOR);
  prevByFp.forEach((prevEl, fp) => {
    if (nextFps.has(fp)) return;
    // Skip headings — a removed section heading would clutter the navigator.
    if (/^H[1-6]$/.test(prevEl.tagName)) return;

    const removedEl = nextDoc.createElement(prevEl.tagName.toLowerCase());
    removedEl.className = DIFF_REMOVED_CLASS;
    removedEl.innerHTML = prevEl.innerHTML;

    const prevH2 = findPrecedingH2(prevEl);
    if (prevH2) {
      const matchingH2 = findH2ByText(nextDoc, prevH2.textContent ?? '');
      if (matchingH2 && matchingH2.parentNode) {
        matchingH2.parentNode.insertBefore(removedEl, matchingH2.nextSibling);
        return;
      }
    }
    if (firstNextBlock && firstNextBlock.parentNode) {
      firstNextBlock.parentNode.insertBefore(removedEl, firstNextBlock);
    } else {
      nextDoc.body.appendChild(removedEl);
    }
  });

  return serialize(nextDoc);
}

/**
 * Backwards-compatible alias. Older call sites import `annotateAdditions`;
 * routing them through `annotateDiff` keeps behaviour consistent.
 */
export function annotateAdditions(prev: string, next: string): string {
  return annotateDiff(prev, next);
}

/**
 * Remove every diff marker from HTML:
 *  - unwrap `span.legal-diff-added` (preserve inner content)
 *  - remove `class="legal-diff-added"` from headings (added inline)
 *  - delete `.legal-diff-removed` elements entirely
 *
 * Used defensively before persisting HTML so diff markup never reaches storage.
 */
export function stripDiffSpans(html: string): string {
  const parser = getParser();
  if (!parser || !html) return html;
  const doc = parser.parseFromString(html, 'text/html');

  doc.body.querySelectorAll(`span.${DIFF_ADDED_CLASS}`).forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });

  doc.body.querySelectorAll(`.${DIFF_ADDED_CLASS}`).forEach((el) => {
    el.classList.remove(DIFF_ADDED_CLASS);
    if (el.getAttribute('class') === '') el.removeAttribute('class');
  });

  doc.body.querySelectorAll(`.${DIFF_REMOVED_CLASS}`).forEach((el) => {
    el.parentNode?.removeChild(el);
  });

  return serialize(doc);
}

/**
 * Compare two HTML strings ignoring whitespace and diff markers.
 * Returns true when the rendered, semantically meaningful content matches.
 */
export function htmlEqualsNormalized(a: string, b: string): boolean {
  const normalize = (s: string) =>
    stripDiffSpans(s ?? '')
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim()
      .toLowerCase();
  return normalize(a) === normalize(b);
}
