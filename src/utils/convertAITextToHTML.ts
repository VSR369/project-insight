/**
 * convertAITextToHTML — Converts AI-generated plain text into structured HTML
 * suitable for the Tiptap RichTextEditor.
 *
 * convertHTMLToAIText — Reverse operation for storing back to database.
 */

/* ── Regex patterns ─────────────────────────────────────── */

const HTML_TAG_RE = /<\/?[a-z][\s\S]*>/i;
const UL_PREFIX_RE = /^[-•]\s+/;
const OL_PREFIX_RE = /^\d+\.\s+/;
const INLINE_BOLD_RE = /\*([^*]+)\*/g;
const PARENTHETICAL_OL_RE = /\((\d+)\)\s+/g;
const SHORT_HEADING_MAX = 60;

/* ── HTML escaping ──────────────────────────────────────── */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Convert inline *bold* markers to <strong> tags.
 * Operates on already-escaped HTML content.
 */
function convertInlineBold(escaped: string): string {
  // The asterisks themselves are plain text (not escaped), so match them directly
  return escaped.replace(/\*([^*]+)\*/g, "<strong>$1</strong>");
}

/**
 * Escape HTML and then apply inline formatting (bold).
 */
function processInlineFormatting(text: string): string {
  // First extract bold markers, escape inner text, then reassemble
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const boldRe = /\*([^*]+)\*/g;

  while ((match = boldRe.exec(text)) !== null) {
    // Text before the match
    if (match.index > lastIndex) {
      parts.push(escapeHtml(text.slice(lastIndex, match.index)));
    }
    // Bold content
    parts.push(`<strong>${escapeHtml(match[1])}</strong>`);
    lastIndex = boldRe.lastIndex;
  }

  // Remaining text after last match
  if (lastIndex < text.length) {
    parts.push(escapeHtml(text.slice(lastIndex)));
  }

  return parts.join("");
}

/* ── Parenthetical numbered pattern detection ───────────── */

/**
 * Detect "(1) text, (2) text, (3) text" pattern in a single line.
 * Returns intro text (before "(1)") and individual list items.
 */
function tryParseParentheticalOl(line: string): { intro: string | null; items: string[] } | null {
  const pattern = /\((\d+)\)\s+/g;
  const matches = [...line.matchAll(pattern)];
  if (matches.length < 2) return null;

  // Extract intro text before "(1)"
  const firstIndex = matches[0].index!;
  let intro: string | null = line.slice(0, firstIndex).trim();
  // Strip trailing colon from intro
  if (intro) {
    intro = intro.replace(/:\s*$/, "").trim() || null;
  } else {
    intro = null;
  }

  const items: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : line.length;
    let item = line.slice(start, end).trim();
    // Strip trailing comma, semicolon, or period separators
    item = item.replace(/[,;.]\s*$/, "").trim();
    // Capitalize first letter
    if (item) {
      item = item.charAt(0).toUpperCase() + item.slice(1);
      items.push(item);
    }
  }

  return items.length >= 2 ? { intro, items } : null;
}

/* ── Main: Text → HTML ──────────────────────────────────── */

/**
 * Converts AI-generated plain text into structured HTML.
 *
 * Rules:
 *  1. Split by newline
 *  2. Consecutive "- " / "• " lines → <ul>
 *  3. Consecutive "1." "2." lines → <ol>
 *  4. Empty lines → block separator
 *  5. Short lines ending with ":" (< 60 chars) → <h3>
 *  6. *text* → <strong>text</strong>
 *  7. All other lines → <p>
 *  8. "(1) text, (2) text" inline pattern → <ol><li>
 *  9. Trim whitespace from each line
 * 10. Returns valid HTML string
 */
export function convertAITextToHTML(rawText: string): string {
  if (!rawText?.trim()) return "";

  // If already HTML, pass through
  if (HTML_TAG_RE.test(rawText.trim())) {
    return rawText;
  }

  const lines = rawText.split("\n");
  const blocks: string[] = [];
  let ulBuffer: string[] = [];
  let olBuffer: string[] = [];

  const flushUl = () => {
    if (ulBuffer.length > 0) {
      blocks.push(
        `<ul>${ulBuffer.map((t) => `<li>${processInlineFormatting(t)}</li>`).join("")}</ul>`
      );
      ulBuffer = [];
    }
  };

  const flushOl = () => {
    if (olBuffer.length > 0) {
      blocks.push(
        `<ol>${olBuffer.map((t) => `<li>${processInlineFormatting(t)}</li>`).join("")}</ol>`
      );
      olBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    // Rule 4: empty line → flush lists, insert break separator
    if (!trimmed) {
      flushUl();
      flushOl();
      continue;
    }

    // Rule 2: unordered list item
    if (UL_PREFIX_RE.test(trimmed)) {
      flushOl();
      ulBuffer.push(trimmed.replace(UL_PREFIX_RE, ""));
      continue;
    }

    // Rule 3: ordered list item (e.g. "1. text")
    if (OL_PREFIX_RE.test(trimmed)) {
      flushUl();
      olBuffer.push(trimmed.replace(OL_PREFIX_RE, ""));
      continue;
    }

    // Flush open lists before non-list content
    flushUl();
    flushOl();

    // Rule 8: parenthetical numbered pattern "(1) text, (2) text"
    const parentheticalResult = tryParseParentheticalOl(trimmed);
    if (parentheticalResult) {
      if (parentheticalResult.intro) {
        blocks.push(`<p>${processInlineFormatting(parentheticalResult.intro)}:</p>`);
      }
      blocks.push(
        `<ol>${parentheticalResult.items.map((t) => `<li>${processInlineFormatting(t)}</li>`).join("")}</ol>`
      );
      continue;
    }

    // Rule 5: short line ending with ":" → heading
    if (trimmed.endsWith(":") && trimmed.length < SHORT_HEADING_MAX) {
      blocks.push(`<h3>${processInlineFormatting(trimmed)}</h3>`);
      continue;
    }

    // Rule 7: regular paragraph
    blocks.push(`<p>${processInlineFormatting(trimmed)}</p>`);
  }

  flushUl();
  flushOl();

  return blocks.join("");
}

/* ── Reverse: HTML → plain text ─────────────────────────── */

/**
 * Converts structured HTML back to AI-style plain text for database storage.
 *
 * Reverses:
 *  - <h3>…</h3> → "Text:" (preserves colon if present)
 *  - <ul><li>…</li></ul> → "- item" per line
 *  - <ol><li>…</li></ol> → "1. item" per line
 *  - <strong>text</strong> → *text*
 *  - <p>…</p> → plain line
 *  - <br> / <br /> → newline
 *  - Strips all other HTML tags
 *  - Unescapes HTML entities
 */
export function convertHTMLToAIText(html: string): string {
  if (!html?.trim()) return "";

  let text = html;

  // Normalize <br> variants to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Convert <strong>/<b> to *bold*
  text = text.replace(/<(?:strong|b)>([\s\S]*?)<\/(?:strong|b)>/gi, "*$1*");

  // Convert <em>/<i> to *italic* (same markdown style)
  text = text.replace(/<(?:em|i)>([\s\S]*?)<\/(?:em|i)>/gi, "*$1*");

  // Process headings → "Heading:" or keep colon if already present
  text = text.replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_match, content) => {
    const cleaned = stripTags(content).trim();
    return cleaned.endsWith(":") ? `\n${cleaned}\n` : `\n${cleaned}:\n`;
  });

  // Process unordered lists
  text = text.replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner) => {
    const items = extractListItemTexts(inner);
    return "\n" + items.map((item) => `- ${item}`).join("\n") + "\n";
  });

  // Process ordered lists
  text = text.replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner) => {
    const items = extractListItemTexts(inner);
    return "\n" + items.map((item, i) => `${i + 1}. ${item}`).join("\n") + "\n";
  });

  // Convert <p> tags to double-newline separated blocks
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_match, content) => {
    return `${stripTags(content).trim()}\n`;
  });

  // Strip any remaining HTML tags
  text = stripTags(text);

  // Unescape HTML entities
  text = unescapeHtml(text);

  // Clean up excessive whitespace: collapse 3+ newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");

  return text.trim();
}

/* ── Internal helpers ───────────────────────────────────── */

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, "");
}

function extractListItemTexts(listInnerHtml: string): string[] {
  const items: string[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liRe.exec(listInnerHtml)) !== null) {
    const content = stripTags(match[1]).trim();
    if (content) items.push(content);
  }
  return items;
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}
