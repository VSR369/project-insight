/**
 * bulkAcceptHelpers — Pure logic for "Accept All AI Suggestions" feature.
 * Partitions sections and orchestrates staggered saves.
 */

import { EXTENDED_BRIEF_FIELD_MAP, SECTION_FORMAT_CONFIG } from '@/lib/cogniblend/curationSectionFormats';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

/** Sections that are structurally impossible to bulk-accept */
const BULK_SKIP_SECTIONS = new Set([
  'legal_docs',
  'escrow_funding',
]);

export interface BulkAcceptPartition {
  regular: Array<{ key: SectionKey; suggestion: string }>;
  extendedBrief: Array<{ key: SectionKey; jsonbField: string; suggestion: string }>;
  skipped: SectionKey[];
}

/**
 * Collect all sections with pending AI suggestions and partition them
 * into regular DB fields vs extended_brief subsections.
 */
export function partitionSuggestionsForBulkAccept(
  sections: Partial<Record<SectionKey, SectionStoreEntry>>,
): BulkAcceptPartition {
  const regular: BulkAcceptPartition['regular'] = [];
  const extendedBrief: BulkAcceptPartition['extendedBrief'] = [];
  const skipped: SectionKey[] = [];

  for (const [key, entry] of Object.entries(sections)) {
    const sectionKey = key as SectionKey;
    if (!entry?.aiSuggestion || entry.addressed) continue;

    if (BULK_SKIP_SECTIONS.has(sectionKey)) {
      skipped.push(sectionKey);
      continue;
    }

    const config = SECTION_FORMAT_CONFIG[sectionKey];
    if (!config) {
      skipped.push(sectionKey);
      continue;
    }

    const suggestion = typeof entry.aiSuggestion === 'string'
      ? entry.aiSuggestion
      : JSON.stringify(entry.aiSuggestion);

    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[sectionKey];
    if (jsonbField) {
      extendedBrief.push({ key: sectionKey, jsonbField, suggestion });
    } else {
      regular.push({ key: sectionKey, suggestion });
    }
  }

  return { regular, extendedBrief, skipped };
}

/**
 * Count sections with pending (non-addressed) AI suggestions.
 */
export function countPendingSuggestions(
  sections: Partial<Record<SectionKey, SectionStoreEntry>>,
): number {
  let count = 0;
  for (const [key, entry] of Object.entries(sections)) {
    if (!entry?.aiSuggestion || entry.addressed) continue;
    if (BULK_SKIP_SECTIONS.has(key)) continue;
    if (!SECTION_FORMAT_CONFIG[key]) continue;
    count++;
  }
  return count;
}
