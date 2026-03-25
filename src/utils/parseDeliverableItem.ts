/**
 * Parses deliverable items from various formats into structured objects.
 * Handles: flat strings ("D1: Title: Description. Acceptance criteria: ..."),
 * JSON strings, and pre-structured objects.
 */

export interface DeliverableItem {
  id: string;
  name: string;
  description: string;
  acceptance_criteria: string;
}

/**
 * Parses a flat string like "D1: Title: Description. Acceptance criteria: Criteria"
 */
export function parseDeliverableItem(raw: string, fallbackIndex: number): DeliverableItem {
  const trimmed = raw.trim();

  // Step 1: Extract ID prefix (e.g., "D1:", "O2:")
  const idMatch = trimmed.match(/^([A-Z]\d+):\s*/);
  const id = idMatch ? idMatch[1] : `D${fallbackIndex + 1}`;
  const withoutId = idMatch ? trimmed.slice(idMatch[0].length) : trimmed;

  // Step 2: Split on "Acceptance criteria:" (case-insensitive)
  const acSplit = withoutId.split(/acceptance\s*criteria:\s*/i);

  const acceptance_criteria = acSplit.length >= 2 ? acSplit.slice(1).join('Acceptance criteria: ').trim() : '';
  const titleDescPart = acSplit[0].trim();

  // Step 3: Split title from description on first ":"
  const colonIdx = titleDescPart.indexOf(':');
  const name = colonIdx > -1 ? titleDescPart.slice(0, colonIdx).trim() : titleDescPart;
  const description = colonIdx > -1 ? titleDescPart.slice(colonIdx + 1).trim() : '';

  return { id, name, description, acceptance_criteria };
}

/**
 * Parses a JSON object (string or already-parsed) into a DeliverableItem.
 */
export function parseDeliverableFromJSON(raw: any, fallbackIndex: number): DeliverableItem | null {
  let obj = raw;

  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }

  if (obj !== null && typeof obj === 'object' && !Array.isArray(obj)) {
    // Has structured fields — use them directly
    if (obj.name || obj.title) {
      return {
        id: obj.id ?? `D${fallbackIndex + 1}`,
        name: obj.name ?? obj.title ?? '',
        description: obj.description ?? '',
        acceptance_criteria: obj.acceptance_criteria ?? obj.acceptanceCriteria ?? '',
      };
    }
  }

  return null;
}

/**
 * Orchestrator: parses an array of mixed-format items into structured DeliverableItems.
 * Tries JSON parse first, then regex, then plain fallback.
 */
export function parseDeliverables(
  items: any[],
  badgePrefix: string = 'D'
): DeliverableItem[] {
  if (!items || items.length === 0) return [];

  return items.map((item, i) => {
    // Already a structured object with name/title
    const fromJSON = parseDeliverableFromJSON(item, i);
    if (fromJSON) {
      return { ...fromJSON, id: fromJSON.id || `${badgePrefix}${i + 1}` };
    }

    // Flat string — try regex parsing
    if (typeof item === 'string') {
      const parsed = parseDeliverableItem(item, i);
      // Ensure badge prefix matches
      if (!parsed.id.startsWith(badgePrefix)) {
        parsed.id = `${badgePrefix}${i + 1}`;
      }
      return parsed;
    }

    // Unknown format — fallback
    return {
      id: `${badgePrefix}${i + 1}`,
      name: String(item),
      description: '',
      acceptance_criteria: '',
    };
  });
}
