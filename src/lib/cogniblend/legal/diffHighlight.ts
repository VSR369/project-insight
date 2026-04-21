/**
 * diffHighlight — clause-level diff annotation for legal documents.
 *
 * Used by the LC Pass 3 panel to mark newly-added/changed clauses in red
 * after a Consolidate / Re-run. Block-level (paragraph/list-item/heading)
 * fingerprinting — sufficient for legal review where clauses, not chars,
 * are the meaningful unit.
 *
 * All exports are pure / SSR-safe (DOMParser is browser-only; functions
 * gracefully no-op when `typeof window === 'undefined'`).
 */

const DIFF_CLASS = 'legal-diff-added';
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

/**
 * Wrap inner HTML of every block in `next` whose normalized text fingerprint
 * does NOT exist in `prev`. Returns the annotated HTML string.
 *
 * If `prev` is empty, the entire `next` is returned unchanged (first
 * generation — nothing to compare against).
 */
export function annotateAdditions(prev: string, next: string): string {
  const parser = getParser();
  if (!parser || !next) return next;
  if (!prev || !prev.trim()) return next;

  const prevDoc = parser.parseFromString(prev, 'text/html');
  const nextDoc = parser.parseFromString(next, 'text/html');

  const prevPrints = new Set<string>();
  prevDoc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (fp) prevPrints.add(fp);
  });

  nextDoc.body.querySelectorAll(BLOCK_SELECTOR).forEach((el) => {
    const fp = fingerprint(el.textContent ?? '');
    if (!fp) return;
    if (prevPrints.has(fp)) return;
    // Avoid double-wrapping if already annotated.
    if (el.querySelector(`span.${DIFF_CLASS}`)) return;
    const span = nextDoc.createElement('span');
    span.className = DIFF_CLASS;
    span.innerHTML = el.innerHTML;
    el.innerHTML = '';
    el.appendChild(span);
  });

  return serialize(nextDoc);
}

/**
 * Remove every `<span class="legal-diff-added">` wrapper, preserving inner
 * content. Used defensively before persisting HTML to the DB so highlight
 * markup never reaches storage.
 */
export function stripDiffSpans(html: string): string {
  const parser = getParser();
  if (!parser || !html) return html;
  const doc = parser.parseFromString(html, 'text/html');
  doc.body.querySelectorAll(`span.${DIFF_CLASS}`).forEach((span) => {
    const parent = span.parentNode;
    if (!parent) return;
    while (span.firstChild) parent.insertBefore(span.firstChild, span);
    parent.removeChild(span);
  });
  return serialize(doc);
}

/**
 * Compare two HTML strings ignoring whitespace and diff-span wrappers.
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
