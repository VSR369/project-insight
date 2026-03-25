/**
 * sanitizeSectionContent — Detects and repairs corrupted section content
 * where JSON arrays/objects were stored as literal text or wrapped in <p> tags.
 *
 * This is a defensive utility that repairs already-corrupted stored content
 * AND prevents future display breakage in the Tiptap editor.
 */

const ARRAY_IN_PTAG_RE = /^<p>\s*(\[[\s\S]*\])\s*<\/p>$/;
const OBJECT_IN_PTAG_RE = /^<p>\s*(\{[\s\S]*\})\s*<\/p>$/;

/**
 * Detect whether content is corrupted (JSON stored as literal text).
 */
export function isCorruptedContent(content: string): boolean {
  if (!content?.trim()) return false;
  const trimmed = content.trim();
  return (
    ARRAY_IN_PTAG_RE.test(trimmed) ||
    OBJECT_IN_PTAG_RE.test(trimmed) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']') && isValidJsonArray(trimmed))
  );
}

/**
 * Repair corrupted content by converting JSON arrays into semantic HTML.
 *
 * - JSON arrays (raw or in <p>) → <ol><li>...</li></ol>
 * - JSON objects in <p> → pass through (table renderer handles these)
 * - Valid HTML → pass through unchanged
 */
export function sanitizeSectionContent(content: string): string {
  if (!content?.trim()) return content;
  const trimmed = content.trim();

  // Case 1: <p>["item1","item2"]</p> — JSON array wrapped in p tag
  const arrayInPMatch = trimmed.match(ARRAY_IN_PTAG_RE);
  if (arrayInPMatch) {
    const converted = tryConvertJsonArrayToHtml(arrayInPMatch[1]);
    if (converted) return converted;
  }

  // Case 2: Raw JSON array string ["item1","item2"]
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const converted = tryConvertJsonArrayToHtml(trimmed);
    if (converted) return converted;
  }

  // Case 3: <p>{"key":"val"}</p> — JSON object in p tag
  // Pass through unchanged — let TableLineItemRenderer handle it
  if (OBJECT_IN_PTAG_RE.test(trimmed)) {
    return content;
  }

  // Default: already valid HTML, pass through
  return content;
}

/* ── Internal helpers ───────────────────────────────────── */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function tryConvertJsonArrayToHtml(jsonStr: string): string | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    const items = parsed
      .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      .map((item) => `<li>${escapeHtml(item.trim())}</li>`);
    if (items.length === 0) return null;
    return `<ol>${items.join('')}</ol>`;
  } catch {
    return null;
  }
}

function isValidJsonArray(str: string): boolean {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed);
  } catch {
    return false;
  }
}
