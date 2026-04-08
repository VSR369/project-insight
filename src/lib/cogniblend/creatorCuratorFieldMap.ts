/**
 * Creator → Curator Field Mapping Matrix
 *
 * Authoritative reference for how Creator form fields map to Curator sections.
 * Ensures format alignment and correct serialization for seamless data flow.
 */

import type { SectionFormat } from './curationSectionFormats';

export interface FieldMapping {
  /** Creator form field name */
  creatorField: string;
  /** Curator section key (matches SECTION_FORMAT_CONFIG) */
  curatorSection: string;
  /** Expected format (must match curator's SECTION_FORMAT_CONFIG) */
  format: SectionFormat;
  /** DB column or JSONB path where data is stored */
  dbPath: string;
  /** Description for documentation */
  description: string;
}

/**
 * Mapping matrix: Creator form fields → Curator sections.
 * Format MUST match the curator's SECTION_FORMAT_CONFIG.
 */
export const CREATOR_CURATOR_FIELD_MAP: FieldMapping[] = [
  // ── Direct challenge columns ──
  {
    creatorField: 'title',
    curatorSection: 'hook',
    format: 'rich_text',
    dbPath: 'challenges.title',
    description: 'Challenge title → Hook section',
  },
  {
    creatorField: 'problem_statement',
    curatorSection: 'problem_statement',
    format: 'rich_text',
    dbPath: 'challenges.problem_statement',
    description: 'Problem statement (rich text)',
  },
  {
    creatorField: 'scope',
    curatorSection: 'scope',
    format: 'rich_text',
    dbPath: 'challenges.scope',
    description: 'Scope definition (rich text)',
  },
  {
    creatorField: 'deliverables_list',
    curatorSection: 'deliverables',
    format: 'line_items',
    dbPath: 'challenges.deliverables',
    description: 'Deliverables list (string array)',
  },
  {
    creatorField: 'expected_outcomes',
    curatorSection: 'expected_outcomes',
    format: 'line_items',
    dbPath: 'challenges.expected_outcomes',
    description: 'Expected outcomes as line items (string array)',
  },
  {
    creatorField: 'submission_guidelines',
    curatorSection: 'submission_guidelines',
    format: 'line_items',
    dbPath: 'challenges.submission_guidelines',
    description: 'Submission guidelines as line items (string array)',
  },
  {
    creatorField: 'domain_tags',
    curatorSection: 'domain_tags',
    format: 'tag_input',
    dbPath: 'challenges.domain_tags',
    description: 'Domain tags (array of strings)',
  },
  {
    creatorField: 'maturity_level',
    curatorSection: 'maturity_level',
    format: 'checkbox_single',
    dbPath: 'challenges.solution_maturity_id',
    description: 'Solution maturity level (FK to md_solution_maturity)',
  },
  {
    creatorField: 'weighted_criteria',
    curatorSection: 'evaluation_criteria',
    format: 'table',
    dbPath: 'challenges.evaluation_criteria',
    description: 'Evaluation criteria table',
  },
  {
    creatorField: 'ip_model',
    curatorSection: 'ip_model',
    format: 'checkbox_single',
    dbPath: 'challenges.ip_model',
    description: 'IP model selection',
  },

  // ── Extended brief JSONB fields ──
  {
    creatorField: 'context_background',
    curatorSection: 'context_and_background',
    format: 'rich_text',
    dbPath: 'challenges.extended_brief.context_background',
    description: 'Context & background (rich text)',
  },
  {
    creatorField: 'root_causes',
    curatorSection: 'root_causes',
    format: 'line_items',
    dbPath: 'challenges.extended_brief.root_causes',
    description: 'Root causes as line items (string array)',
  },
  {
    creatorField: 'affected_stakeholders',
    curatorSection: 'affected_stakeholders',
    format: 'table',
    dbPath: 'challenges.extended_brief.affected_stakeholders',
    description: 'Affected stakeholders table (structured rows)',
  },
  {
    creatorField: 'current_deficiencies',
    curatorSection: 'current_deficiencies',
    format: 'line_items',
    dbPath: 'challenges.extended_brief.current_deficiencies',
    description: 'Current deficiencies as line items (string array)',
  },
  {
    creatorField: 'preferred_approach',
    curatorSection: 'preferred_approach',
    format: 'line_items',
    dbPath: 'challenges.extended_brief.preferred_approach',
    description: 'Preferred approach as line items (string array)',
  },
  {
    creatorField: 'approaches_not_of_interest',
    curatorSection: 'approaches_not_of_interest',
    format: 'line_items',
    dbPath: 'challenges.extended_brief.approaches_not_of_interest',
    description: 'Approaches NOT of interest as line items (string array)',
  },
];

/**
 * Quick lookup: creator field → mapping entry
 */
export const FIELD_MAP_BY_CREATOR: Record<string, FieldMapping> = Object.fromEntries(
  CREATOR_CURATOR_FIELD_MAP.map((m) => [m.creatorField, m]),
);

/**
 * Quick lookup: curator section → mapping entry
 */
export const FIELD_MAP_BY_CURATOR: Record<string, FieldMapping> = Object.fromEntries(
  CREATOR_CURATOR_FIELD_MAP.map((m) => [m.curatorSection, m]),
);

/**
 * Serialize a line_items field value (string[]) into curator-compatible JSON.
 * Format: { items: [{ name: "..." }, ...] }
 */
export function serializeLineItems(items: string[] | undefined): Record<string, unknown> | null {
  if (!items) return null;
  const filtered = items.filter((s) => s.trim().length > 0);
  if (filtered.length === 0) return null;
  return { items: filtered.map((name) => ({ name })) };
}

/**
 * Serialize affected_stakeholders into curator-compatible JSON array.
 */
export function serializeStakeholders(
  rows: Array<{ stakeholder_name: string; role: string; impact_description: string; adoption_challenge: string }>,
): string | null {
  const filtered = rows.filter((r) => r.stakeholder_name.trim().length > 0);
  if (filtered.length === 0) return null;
  return JSON.stringify(filtered);
}
