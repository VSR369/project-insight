/**
 * Detects whether an array of line-item strings contains JSON objects
 * and parses them into a tabular structure for rich rendering.
 */

export interface DetectionResult {
  type: 'plain' | 'table';
  schema: string[];
  rows: Record<string, unknown>[];
}

export function detectAndParseLineItems(items: string[]): DetectionResult {
  if (!items || items.length === 0) {
    return { type: 'plain', schema: [], rows: [] };
  }

  const parsed = items.map((item) => {
    try {
      const obj = JSON.parse(item.trim());
      if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
        return obj as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  });

  const allParsed = parsed.every((p) => p !== null);

  if (!allParsed) {
    return { type: 'plain', schema: [], rows: [] };
  }

  // Extract column keys from first item
  const schema = Object.keys(parsed[0]!);

  return {
    type: 'table',
    schema,
    rows: parsed as Record<string, unknown>[],
  };
}

/**
 * Parses a scoring method string like "AUC > 0.90 = 30 pts, 0.80-0.89 = 15 pts"
 * into structured segments for multi-line rendering.
 */
export interface ScoringSegment {
  condition: string;
  points: string;
}

export function parseScoringMethod(raw: string): ScoringSegment[] {
  if (!raw || typeof raw !== 'string') return [];

  return raw.split(',').map((segment) => {
    const parts = segment.split('=');
    if (parts.length >= 2) {
      return {
        condition: parts.slice(0, -1).join('=').trim(),
        points: parts[parts.length - 1].trim(),
      };
    }
    return { condition: segment.trim(), points: '' };
  });
}

/**
 * Formats a schema key into a human-readable column header.
 * e.g., "scoring_method" → "Scoring Method"
 */
export function formatColumnHeader(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
