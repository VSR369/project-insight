/**
 * convertAITextToHTML — Converts AI-generated plain text into structured HTML
 * suitable for the Tiptap RichTextEditor.
 *
 * Rules:
 *  - Lines starting with "- " or "• " → <ul><li>
 *  - Lines starting with "1. 2. 3." → <ol><li>
 *  - ALL CAPS lines or lines ending with ":" → <h3>
 *  - Other non-empty lines → <p>
 *  - Blank lines separate blocks
 */

const ALL_CAPS_RE = /^[A-Z][A-Z\s\d&,;:.\-/()]{2,}$/;
const UL_PREFIX_RE = /^[-•]\s+/;
const OL_PREFIX_RE = /^\d+\.\s+/;

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function convertAITextToHTML(rawText: string): string {
  if (!rawText?.trim()) return "";

  // If it already looks like HTML, pass through
  if (/<\/?[a-z][\s\S]*>/i.test(rawText.trim())) {
    return rawText;
  }

  const lines = rawText.split("\n");
  const blocks: string[] = [];
  let ulBuffer: string[] = [];
  let olBuffer: string[] = [];

  const flushUl = () => {
    if (ulBuffer.length > 0) {
      blocks.push(`<ul>${ulBuffer.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ul>`);
      ulBuffer = [];
    }
  };

  const flushOl = () => {
    if (olBuffer.length > 0) {
      blocks.push(`<ol>${olBuffer.map(t => `<li>${escapeHtml(t)}</li>`).join("")}</ol>`);
      olBuffer = [];
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      flushUl();
      flushOl();
      continue;
    }

    // Unordered list item
    if (UL_PREFIX_RE.test(trimmed)) {
      flushOl();
      ulBuffer.push(trimmed.replace(UL_PREFIX_RE, ""));
      continue;
    }

    // Ordered list item
    if (OL_PREFIX_RE.test(trimmed)) {
      flushUl();
      olBuffer.push(trimmed.replace(OL_PREFIX_RE, ""));
      continue;
    }

    // Flush any open lists before non-list content
    flushUl();
    flushOl();

    // Heading: ALL CAPS or ends with ":"
    if (ALL_CAPS_RE.test(trimmed) || trimmed.endsWith(":")) {
      blocks.push(`<h3>${escapeHtml(trimmed)}</h3>`);
      continue;
    }

    // Regular paragraph
    blocks.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  flushUl();
  flushOl();

  return blocks.join("");
}
