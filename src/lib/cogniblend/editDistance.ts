/**
 * Edit Distance — Word-level diff for measuring AI vs curator changes.
 * Strips HTML, normalizes whitespace, computes match ratio.
 */

/**
 * Strip HTML tags and normalize whitespace.
 */
function normalize(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Tokenize normalized text into words.
 */
function tokenize(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean);
}

/**
 * Compute edit distance percentage between two text strings.
 * Returns 0 = identical, 100 = completely different.
 */
export function computeEditDistance(original: string, modified: string): number {
  if (!original && !modified) return 0;
  if (!original || !modified) return 100;

  const origWords = tokenize(original);
  const modWords = tokenize(modified);

  if (origWords.length === 0 && modWords.length === 0) return 0;
  if (origWords.length === 0 || modWords.length === 0) return 100;

  // Simple set-based overlap for performance
  const origSet = new Set(origWords);
  const modSet = new Set(modWords);

  let matches = 0;
  for (const word of modSet) {
    if (origSet.has(word)) matches++;
  }

  const maxLen = Math.max(origSet.size, modSet.size);
  const matchRatio = matches / maxLen;

  return Math.round((1 - matchRatio) * 100);
}

/**
 * Generate a simple content hash for tracking changes.
 */
export function contentHash(text: string): string {
  const normalized = normalize(text);
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const chr = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return hash.toString(36);
}
