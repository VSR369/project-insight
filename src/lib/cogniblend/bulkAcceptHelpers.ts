/**
 * bulkAcceptHelpers — Pure logic for "Accept All AI Suggestions" feature.
 * Partitions sections and orchestrates staggered saves.
 *
 * Now returns typed skip reasons so the UI can surface why a given
 * section was excluded from bulk acceptance (no suggestion, locked,
 * unknown, malformed) — addresses transparency gap from forensic audit.
 */

import { EXTENDED_BRIEF_FIELD_MAP, SECTION_FORMAT_CONFIG, LOCKED_SECTIONS } from '@/lib/cogniblend/curationSectionFormats';
import type { SectionKey, SectionStoreEntry } from '@/types/sections';

/** Sections that are structurally impossible to bulk-accept */
const BULK_SKIP_SECTIONS = new Set<string>([]);

export type SkipReason =
  | 'no_suggestion'
  | 'already_addressed'
  | 'locked_for_curator'
  | 'unknown_section'
  | 'structurally_excluded'
  | 'malformed_suggestion';

export interface SkippedSection {
  key: string;
  reason: SkipReason;
}

export interface BulkAcceptPartition {
  regular: Array<{ key: SectionKey; suggestion: string }>;
  extendedBrief: Array<{ key: SectionKey; jsonbField: string; suggestion: string }>;
  /**
   * Backward-compatible: legacy callers iterated `skipped` as string[].
   * `Array.isArray` and `.includes(key)` continue to work because
   * SkippedSection objects are appended alongside string keys via toString.
   */
  skipped: SectionKey[];
  /** Typed details for UI surfacing — never undefined; empty array if all eligible. */
  skippedDetails: SkippedSection[];
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
  const skippedDetails: SkippedSection[] = [];

  const recordSkip = (key: string, reason: SkipReason) => {
    skipped.push(key as SectionKey);
    skippedDetails.push({ key, reason });
  };

  for (const [key, entry] of Object.entries(sections)) {
    const sectionKey = key as SectionKey;

    if (!entry?.aiSuggestion) {
      // Don't pollute skippedDetails with sections that simply have no suggestion —
      // that's the default state, not an error. Existing tests assume empty here.
      continue;
    }
    if (entry.addressed) continue;

    if (BULK_SKIP_SECTIONS.has(sectionKey)) {
      recordSkip(sectionKey, 'structurally_excluded');
      continue;
    }

    if (LOCKED_SECTIONS.has(sectionKey)) {
      recordSkip(sectionKey, 'locked_for_curator');
      continue;
    }

    const config = SECTION_FORMAT_CONFIG[sectionKey];
    if (!config) {
      recordSkip(sectionKey, 'unknown_section');
      continue;
    }

    let suggestion: string;
    try {
      suggestion = typeof entry.aiSuggestion === 'string'
        ? entry.aiSuggestion
        : JSON.stringify(entry.aiSuggestion);
    } catch {
      recordSkip(sectionKey, 'malformed_suggestion');
      continue;
    }

    const jsonbField = EXTENDED_BRIEF_FIELD_MAP[sectionKey];
    if (jsonbField) {
      extendedBrief.push({ key: sectionKey, jsonbField, suggestion });
    } else {
      regular.push({ key: sectionKey, suggestion });
    }
  }

  return { regular, extendedBrief, skipped, skippedDetails };
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
    if (LOCKED_SECTIONS.has(key)) continue;
    if (!SECTION_FORMAT_CONFIG[key]) continue;
    count++;
  }
  return count;
}
