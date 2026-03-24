/**
 * creatorDataTransformer — Utilities to parse creator free-text content
 * into structured items for curator section renderers.
 *
 * When creators enter content in Phase 1-2, it may be:
 * - Already structured JSON (ideal case)
 * - Rich text HTML with <li> items
 * - Plain text with numbered/bulleted lines
 * - A prose paragraph (fallback — show raw with banner)
 */

/* ── Types ─────────────────────────────────────────────── */

export interface TransformResult {
  /** Successfully parsed structured items */
  items: string[];
  /** Whether the content was parseable as structured data */
  isParsed: boolean;
  /** Raw content for fallback display */
  rawContent: string | null;
}

/* ── HTML to line items ────────────────────────────────── */

function extractListItemsFromHtml(html: string): string[] {
  const items: string[] = [];
  // Match <li>...</li> content
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  let match: RegExpExecArray | null;
  while ((match = liRegex.exec(html)) !== null) {
    const text = match[1]
      .replace(/<[^>]+>/g, "") // strip inner HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .trim();
    if (text) items.push(text);
  }
  return items;
}

/* ── Plain text to line items ──────────────────────────── */

function extractLineItemsFromText(text: string): string[] {
  const lines = text.split(/\n/).map((l) => l.trim()).filter(Boolean);
  const items: string[] = [];

  for (const line of lines) {
    // Strip numbered prefixes: "1.", "1)", "- ", "• ", "* "
    const cleaned = line
      .replace(/^\d+[\.\)]\s*/, "")
      .replace(/^[-•*]\s*/, "")
      .trim();
    if (cleaned.length > 3) items.push(cleaned);
  }

  return items;
}

/* ── JSON array extraction ─────────────────────────────── */

function extractFromJson(raw: unknown): string[] | null {
  if (!raw) return null;

  // Already an array of strings
  if (Array.isArray(raw)) {
    return raw.map((item) =>
      typeof item === "string" ? item : (item as any)?.name ?? JSON.stringify(item)
    );
  }

  // Object with items array
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.items)) {
      return obj.items.map((item: unknown) =>
        typeof item === "string" ? item : (item as any)?.name ?? JSON.stringify(item)
      );
    }
  }

  return null;
}

/* ── Main transformer ──────────────────────────────────── */

/**
 * Attempts to transform creator content into structured line items.
 * Tries in order: JSON → HTML list items → text line items → fallback.
 */
export function transformToLineItems(
  content: unknown,
): TransformResult {
  const empty: TransformResult = { items: [], isParsed: false, rawContent: null };

  if (content == null) return empty;

  // 1. Try JSON (already structured)
  const jsonItems = extractFromJson(content);
  if (jsonItems && jsonItems.length > 0) {
    return { items: jsonItems, isParsed: true, rawContent: null };
  }

  // 2. If string, try parsing as JSON first
  if (typeof content === "string") {
    try {
      const parsed = JSON.parse(content);
      const fromParsed = extractFromJson(parsed);
      if (fromParsed && fromParsed.length > 0) {
        return { items: fromParsed, isParsed: true, rawContent: null };
      }
    } catch {
      // Not JSON — continue
    }

    // 3. Try HTML list extraction
    if (content.includes("<li")) {
      const htmlItems = extractListItemsFromHtml(content);
      if (htmlItems.length > 0) {
        return { items: htmlItems, isParsed: true, rawContent: content };
      }
    }

    // 4. Try plain text line extraction (only if multi-line)
    if (content.includes("\n") || /^\d+[\.\)]/.test(content)) {
      const textItems = extractLineItemsFromText(content);
      if (textItems.length >= 2) {
        return { items: textItems, isParsed: true, rawContent: content };
      }
    }

    // 5. Fallback — show raw
    return { items: [], isParsed: false, rawContent: content };
  }

  return { items: [], isParsed: false, rawContent: JSON.stringify(content) };
}

/**
 * Transform creator table content (evaluation_criteria, phase_schedule)
 * into row objects. Returns null if parsing fails.
 */
export function transformToTableRows(
  content: unknown,
): Record<string, unknown>[] | null {
  if (!content) return null;

  let data = content;
  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Direct array of objects
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === "object") {
    return data as Record<string, unknown>[];
  }

  // Object with items/rows/criteria array
  if (typeof data === "object" && data !== null) {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "rows", "criteria", "phases", "schedule"]) {
      if (Array.isArray(obj[key])) {
        return obj[key] as Record<string, unknown>[];
      }
    }
  }

  return null;
}

/**
 * Check if content requires human input — i.e., the format config says
 * AI cannot draft it, or parsing completely fails.
 */
export function contentRequiresHumanInput(
  content: unknown,
  aiCanDraft: boolean,
): boolean {
  if (!aiCanDraft) return true;
  if (content == null || content === "" || content === "null") return true;
  return false;
}
