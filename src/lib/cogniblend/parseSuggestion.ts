/**
 * parseSuggestion — Format-aware parser for AI suggestion strings.
 *
 * The LLM tool schema returns `suggestion` as a string for all section types.
 * This utility converts the raw string into the native data type expected
 * by each section format, so the Zustand store and deepMerge receive
 * correctly typed data.
 *
 * Falls back to the raw string on parse failure — no data loss.
 */

import { SECTION_FORMAT_CONFIG } from '@/lib/cogniblend/curationSectionFormats';
import type { SectionStoreEntry } from '@/types/sections';

/**
 * Parse a raw suggestion string into the native format for the given section.
 *
 * @param sectionKey - The section identifier
 * @param rawSuggestion - Raw string from LLM tool call
 * @returns Parsed data matching the section's expected shape
 */
export function parseSuggestionForSection(
  sectionKey: string,
  rawSuggestion: string,
): SectionStoreEntry['data'] {
  const config = SECTION_FORMAT_CONFIG[sectionKey];
  if (!config) return rawSuggestion;

  switch (config.format) {
    case 'rich_text':
      // Already a string (HTML/markdown) — return as-is
      return rawSuggestion;

    case 'line_items':
    case 'checkbox_multi':
    case 'tag_input':
      // Expect JSON array of strings: '["item1","item2"]'
      return tryParseArray(rawSuggestion);

    case 'table':
    case 'schedule_table':
      // Expect JSON array of row objects: '[{"col":"val"}]'
      return tryParseArray(rawSuggestion);

    case 'checkbox_single':
    case 'structured_fields':
    case 'custom':
      // Expect JSON object: '{"key":"val"}'
      return tryParseObject(rawSuggestion);

    default:
      return rawSuggestion;
  }
}

/** Try to parse as JSON array. Falls back to raw string. */
function tryParseArray(raw: string): SectionStoreEntry['data'] {
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    // If it parsed but isn't an array, return as-is
    return raw;
  } catch {
    return raw;
  }
}

/** Try to parse as JSON object. Falls back to raw string. */
function tryParseObject(raw: string): SectionStoreEntry['data'] {
  try {
    const parsed = JSON.parse(raw);
    if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return raw;
  } catch {
    return raw;
  }
}
