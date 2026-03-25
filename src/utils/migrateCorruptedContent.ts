/**
 * migrateCorruptedContent — One-time migration utility to detect and repair
 * corrupted section content in the database.
 *
 * Used by CurationReviewPage on load to silently fix any fields where
 * JSON arrays/objects were accidentally stored as literal text.
 */

import { isCorruptedContent, sanitizeSectionContent } from './sanitizeSectionContent';

export interface MigrationTarget {
  dbField: string;
  content: string | null;
}

export interface MigrationResult {
  dbField: string;
  fixed: string;
}

/**
 * Scan a list of fields and return those that contain corrupted content,
 * along with the repaired value.
 */
export function findCorruptedFields(fields: MigrationTarget[]): MigrationResult[] {
  return fields
    .filter((f): f is MigrationTarget & { content: string } =>
      typeof f.content === 'string' && f.content.trim().length > 0 && isCorruptedContent(f.content)
    )
    .map((f) => ({
      dbField: f.dbField,
      fixed: sanitizeSectionContent(f.content),
    }));
}
