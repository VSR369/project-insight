/**
 * legalTextFormatter — Convert plain-text legal templates into structured HTML
 * compatible with the `.legal-doc` stylesheet.
 *
 * SAFETY: Preview-only. The DB content is unchanged. If the input already
 * contains HTML tags, it is returned untouched (mammoth-converted DOCX, the
 * SPA template, and any post-freeze assembled HTML all pass straight through).
 *
 * Rules (in order):
 *   • First non-empty line  → <h1>
 *   • "Challenge: …" / "Organization: …" lines that follow the title
 *                           → <p class="doc-meta"> (centered subtitle)
 *   • Lines like "1. PARTICIPATION" / "4. PRIZE AND PAYMENT"
 *                           → <h2>
 *   • Lines that are just "(a) …", "(b) …" (lettered sub-clauses on their own
 *     lines)               → wrapped together in <ol class="legal-clauses">
 *   • Blank line           → paragraph break
 *   • Other lines          → <p>
 */

const SECTION_HEADING_REGEX = /^\s*\d+\.\s+[A-Z][A-Z0-9 \-/&,()]{2,}\s*$/;
const SUB_CLAUSE_REGEX = /^\s*\(([a-z]|[ivxlcdm]+)\)\s+(.*\S)\s*$/i;
const META_LINE_REGEX = /^(Challenge|Organization|Organisation|Date|Effective Date|Parties)\s*:\s*.+/i;

/** Cheap detector: does the string already contain HTML markup? */
export function isLikelyHtml(input: string): boolean {
  if (!input) return false;
  // Look for any tag-like construct (covers <p>, <h1>, <div>, <br/>, <span …>)
  return /<\/?[a-z][a-z0-9]*\b[^>]*>/i.test(input);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Convert a plain-text legal document to contract-grade HTML.
 * Returns input unchanged if it is already HTML.
 */
export function formatLegalPlainText(input: string | null | undefined): string {
  if (!input) return '';
  if (isLikelyHtml(input)) return input;

  // Normalize line endings, then split into paragraph blocks on blank lines.
  const normalized = input.replace(/\r\n?/g, '\n').trim();
  if (!normalized) return '';

  const blocks = normalized.split(/\n\s*\n+/);
  const parts: string[] = [];
  let titleConsumed = false;
  let metaPhase = false;

  for (const rawBlock of blocks) {
    const block = rawBlock.replace(/\n+$/, '');
    if (!block.trim()) continue;

    const lines = block.split('\n').map((l) => l.trimEnd());

    // ── Title: first non-empty line of the document ─────────────────
    if (!titleConsumed) {
      const titleLine = lines.shift() ?? '';
      parts.push(`<h1>${escapeHtml(titleLine.trim())}</h1>`);
      titleConsumed = true;
      metaPhase = true;
      // Any remaining lines in this block are treated as meta (Challenge:/Organization:)
      for (const ml of lines) {
        const t = ml.trim();
        if (!t) continue;
        if (META_LINE_REGEX.test(t)) {
          parts.push(`<p class="doc-meta">${escapeHtml(t)}</p>`);
        } else {
          parts.push(`<p>${escapeHtml(t)}</p>`);
          metaPhase = false;
        }
      }
      continue;
    }

    // ── Meta block right after title (Challenge: / Organization:) ──
    if (metaPhase) {
      const allMeta = lines.every((l) => !l.trim() || META_LINE_REGEX.test(l.trim()));
      if (allMeta) {
        for (const ml of lines) {
          const t = ml.trim();
          if (!t) continue;
          parts.push(`<p class="doc-meta">${escapeHtml(t)}</p>`);
        }
        continue;
      }
      metaPhase = false;
    }

    // ── Single-line section heading ─────────────────────────────────
    if (lines.length === 1 && SECTION_HEADING_REGEX.test(lines[0])) {
      parts.push(`<h2>${escapeHtml(lines[0].trim())}</h2>`);
      continue;
    }

    // ── Block of lettered sub-clauses on their own lines ────────────
    const allSubClauses = lines.every((l) => SUB_CLAUSE_REGEX.test(l));
    if (allSubClauses && lines.length >= 2) {
      const items = lines
        .map((l) => {
          const m = l.match(SUB_CLAUSE_REGEX);
          return m ? `<li>${escapeHtml(m[2])}</li>` : '';
        })
        .filter(Boolean)
        .join('');
      parts.push(`<ol class="legal-clauses">${items}</ol>`);
      continue;
    }

    // ── Mixed block: heading line followed by body, or heading inline ─
    // If the first line looks like a heading and subsequent lines are body,
    // emit heading + paragraph separately.
    if (lines.length > 1 && SECTION_HEADING_REGEX.test(lines[0])) {
      parts.push(`<h2>${escapeHtml(lines[0].trim())}</h2>`);
      const body = lines.slice(1).join(' ').replace(/\s+/g, ' ').trim();
      if (body) parts.push(`<p>${escapeHtml(body)}</p>`);
      continue;
    }

    // ── Default: re-flow single newlines as spaces, emit one <p> ────
    const paragraph = lines.join(' ').replace(/\s+/g, ' ').trim();
    if (paragraph) parts.push(`<p>${escapeHtml(paragraph)}</p>`);
  }

  return parts.join('\n');
}
