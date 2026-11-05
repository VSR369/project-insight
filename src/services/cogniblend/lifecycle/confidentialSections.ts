/**
 * confidentialSections — BR-CHL-P09: creator marks individual extended-brief
 * sections confidential. The marked keys are persisted on
 * challenges.confidential_brief_keys; the fn_extract_confidential_brief
 * trigger then moves their content out of extended_brief into
 * challenge_confidential_sections, which providers can read only after
 * accepting the challenge CPA.
 */

/** Extended-brief keys a creator may mark confidential (top-level columns are excluded). */
export const CONFIDENTIAL_ELIGIBLE_KEYS = [
  { key: 'context_background', label: 'Context & Background' },
  { key: 'root_causes', label: 'Root Causes' },
  { key: 'affected_stakeholders', label: 'Affected Stakeholders' },
  { key: 'preferred_approach', label: 'Preferred Approach' },
  { key: 'approaches_not_of_interest', label: 'Approaches NOT of Interest' },
  { key: 'current_deficiencies', label: 'Current Deficiencies' },
] as const;

export type ConfidentialBriefKey = (typeof CONFIDENTIAL_ELIGIBLE_KEYS)[number]['key'];

/** Add or remove a key, returning a new sorted-stable array. */
export function toggleConfidentialKey(keys: string[], key: string): string[] {
  return keys.includes(key) ? keys.filter((k) => k !== key) : [...keys, key];
}

/** Drop keys that are not extended-brief keys (guard against stale form state). */
export function sanitizeConfidentialKeys(keys: string[]): string[] {
  const allowed = new Set<string>(CONFIDENTIAL_ELIGIBLE_KEYS.map((f) => f.key));
  return keys.filter((k) => allowed.has(k));
}

export interface ConfidentialSectionRow {
  section_key: string;
  content: unknown;
}

/**
 * Rehydrate form values from challenge_confidential_sections rows after a
 * draft reload: the trigger has already removed these keys from
 * extended_brief, so the form fields would otherwise come back empty.
 */
export function extractConfidentialFieldValues(
  rows: ConfidentialSectionRow[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const row of rows) {
    const content = row.content as { value?: unknown } | null;
    if (content && 'value' in content) values[row.section_key] = content.value;
  }
  return values;
}
