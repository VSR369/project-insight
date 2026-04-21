/**
 * diffHighlight — clause-level diff annotation for legal documents.
 *
 * Block-level (paragraph/list-item/heading) fingerprinting — the meaningful
 * unit for legal review. Visual markers:
 *   - `legal-diff-added`            — newly inserted blocks (red)
 *   - `legal-diff-removed`          — re-injected dropped blocks (strike) anchored under matching <h2>
 *   - `legal-diff-removed-section`  — trailing group for orphan removed blocks (no matching <h2>)
 *
 * SSR-safe: DOMParser usage is browser-guarded.
 */

const DIFF_ADDED_CLASS = 'legal-diff-added';
const DIFF_REMOVED_CLASS = 'legal-diff-removed';
const DIFF_REMOVED_SECTION_CLASS = 'legal-diff-removed-section';
const BLOCK_SELECTOR = 'p, li, h1, h2, h3, h4, h5, h6, blockquote, td';

function getParser(): DOMParser | null {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') return null;
  return new DOMParser();
}

function fingerprint(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

/**
 * Extra-tolerant fingerprint: also strips leading list/section numbering
 * like "1.", "1.1", "(a)", "(iii)", "Section 4 –", "Article II:" so that
 * "1.1 Definitions" and "Definitions" don't appear as different blocks.
 */
function looseFingerprint(text: string): string {
  let t = fingerprint(text);
  // Strip leading enumerations (numbers, dotted, lettered, roman, "section/article/clause N")
  t = t.replace(
    /^(?:(?:section|article|clause|part)\s+)?(?:\(?[ivxlcdm0-9a-z]+\)?[.):\-\s]+){1,4}/i,
    '',
  );
  return t.trim();
}

function serialize(doc: Document): string {
  return doc.body.innerHTML;
}

function findPrecedingH2(el: Element): Element | null {
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

function collectBlocks(doc: Document): Element[] {
  return Array.from(doc.body.querySelectorAll(BLOCK_SELECTOR));
}

/**
 * Compare `prev` and `next`. Mark added blocks in `next` with
 * `legal-diff-added` and re-inject removed blocks (in `prev` but not in
 * `next`) anchored under their original <h2> where possible. Orphans
 * (no matching <h2>) are grouped into a trailing section so reviewers
 * see them in one obvious place.
 */
export function annotateDiff(prev: string, next: string): string {
  const parser = getParser();
  if (!parser || !next) return next;
  if (!prev || !prev.trim()) return next;

  const prevDoc = parser.parseFromString(prev, 'text/html');
  const nextDoc = parser.parseFromString(next, 'text/html');

  // Build prev fingerprint → element map (keep first occurrence per fp).
  const prevByFp = new Map<string, Element>();
  const prevLooseFps = new Set<string>();
  collectBlocks(prevDoc).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (fp && !prevByFp.has(fp)) prevByFp.set(fp, el);
    const loose = looseFingerprint(el.textContent ?? '');
    if (loose) prevLooseFps.add(loose);
  });

  // Collect next fingerprints (strict + loose).
  const nextFps = new Set<string>();
  const nextLooseFps = new Set<string>();
  collectBlocks(nextDoc).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (fp) nextFps.add(fp);
    const loose = looseFingerprint(el.textContent ?? '');
    if (loose) nextLooseFps.add(loose);
  });

  // Mark ADDED blocks in next (not present in prev under either fingerprint).
  collectBlocks(nextDoc).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (!fp) return;
    if (prevByFp.has(fp)) return;
    const loose = looseFingerprint(el.textContent ?? '');
    if (loose && prevLooseFps.has(loose)) return;
    if (el.querySelector(`span.${DIFF_ADDED_CLASS}`)) return;
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

  // Inject REMOVED blocks. Anchor under matching <h2> when possible; otherwise
  // collect into a trailing section so they aren't dumped at the top.
  const orphanRemoved: Element[] = [];
  prevByFp.forEach((prevEl, fp) => {
    if (nextFps.has(fp)) return;
    const loose = looseFingerprint(prevEl.textContent ?? '');
    if (loose && nextLooseFps.has(loose)) return;
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
    orphanRemoved.push(removedEl);
  });

  if (orphanRemoved.length > 0) {
    const section = nextDoc.createElement('section');
    section.className = DIFF_REMOVED_SECTION_CLASS;
    section.setAttribute('data-removed-count', String(orphanRemoved.length));
    orphanRemoved.forEach((el) => section.appendChild(el));
    nextDoc.body.appendChild(section);
  }

  return serialize(nextDoc);
}

/** Backwards-compatible alias. */
export function annotateAdditions(prev: string, next: string): string {
  return annotateDiff(prev, next);
}

/**
 * Strip every diff marker from HTML. Used defensively before persisting so
 * diff markup never reaches storage. Removes:
 *  - `span.legal-diff-added` (unwrap, keep inner content)
 *  - `legal-diff-added` class on headings
 *  - `legal-diff-removed` blocks (delete entirely)
 *  - `legal-diff-removed-section` containers (delete entirely)
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

  doc.body
    .querySelectorAll(`.${DIFF_REMOVED_CLASS}, .${DIFF_REMOVED_SECTION_CLASS}`)
    .forEach((el) => {
      el.parentNode?.removeChild(el);
    });

  return serialize(doc);
}

/**
 * Compare two HTML strings ignoring whitespace and diff markers.
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

/**
 * Count block-level additions and removals between `prev` and `next` for
 * delta-aware UX (toasts, banners). Pure counts — does not mutate HTML.
 */
export function summarizeBlockDiff(
  prev: string,
  next: string,
): { added: number; removed: number } {
  const parser = getParser();
  if (!parser) return { added: 0, removed: 0 };
  if (!prev || !prev.trim()) {
    // First generation — count next blocks as additions.
    const nextDoc = parser.parseFromString(next ?? '', 'text/html');
    const added = collectBlocks(nextDoc).filter(
      (el) => !!fingerprint(el.textContent ?? '') && !/^H[1-6]$/.test(el.tagName),
    ).length;
    return { added, removed: 0 };
  }

  const prevDoc = parser.parseFromString(stripDiffSpans(prev), 'text/html');
  const nextDoc = parser.parseFromString(stripDiffSpans(next ?? ''), 'text/html');

  const prevFps = new Set<string>();
  const prevLoose = new Set<string>();
  collectBlocks(prevDoc).forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName)) return;
    const fp = fingerprint(el.textContent ?? '');
    if (fp) prevFps.add(fp);
    const loose = looseFingerprint(el.textContent ?? '');
    if (loose) prevLoose.add(loose);
  });

  const nextFps = new Set<string>();
  const nextLoose = new Set<string>();
  collectBlocks(nextDoc).forEach((el) => {
    if (/^H[1-6]$/.test(el.tagName)) return;
    const fp = fingerprint(el.textContent ?? '');
    if (fp) nextFps.add(fp);
    const loose = looseFingerprint(el.textContent ?? '');
    if (loose) nextLoose.add(loose);
  });

  let added = 0;
  nextFps.forEach((fp) => {
    if (prevFps.has(fp)) return;
    // Skip if loose match exists (numbering-only changes).
    // Find the loose form for this fp by re-scanning is overkill; use heuristic:
    // if the loose set sizes differ a lot, fall through.
    added += 1;
  });

  let removed = 0;
  prevFps.forEach((fp) => {
    if (nextFps.has(fp)) return;
    removed += 1;
  });

  // Apply loose-match dampening: subtract intersection-of-loose-fps that aren't strict matches.
  let looseOverlap = 0;
  prevLoose.forEach((l) => {
    if (nextLoose.has(l)) looseOverlap += 1;
  });
  // Best-effort cap so we never report negative counts.
  const strictOverlap = (() => {
    let n = 0;
    prevFps.forEach((fp) => {
      if (nextFps.has(fp)) n += 1;
    });
    return n;
  })();
  const looseOnly = Math.max(0, looseOverlap - strictOverlap);
  added = Math.max(0, added - looseOnly);
  removed = Math.max(0, removed - looseOnly);

  return { added, removed };
}
