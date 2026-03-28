/**
 * Curation Section Format Configuration
 * 
 * Defines the prescribed format for each curator section,
 * controlling rendering, editing, and AI behavior.
 */

export type SectionFormat =
  | 'rich_text'
  | 'line_items'
  | 'table'
  | 'schedule_table'
  | 'checkbox_multi'
  | 'checkbox_single'
  | 'date'
  | 'select'
  | 'radio'
  | 'structured_fields'
  | 'tag_input'
  | 'custom';

export interface SectionFormatConfig {
  format: SectionFormat;
  columns?: string[];
  masterDataTable?: string;
  aiCanDraft: boolean;
  aiReviewEnabled: boolean;
  curatorCanEdit: boolean;
  aiUsesContext: string[];
}

export const SECTION_FORMAT_CONFIG: Record<string, SectionFormatConfig> = {
  problem_statement: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.problem_statement', 'intake.scope'],
  },
  scope: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.scope', 'spec.scope'],
  },
  deliverables: {
    format: 'line_items',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.deliverables', 'spec.expected_outcomes'],
  },
  expected_outcomes: {
    format: 'line_items',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.expected_outcomes'],
  },
  submission_guidelines: {
    format: 'line_items',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['deliverables', 'evaluation_criteria'],
  },
  maturity_level: {
    format: 'checkbox_single',
    masterDataTable: 'maturity_levels',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['deliverables', 'spec.description'],
  },
  evaluation_criteria: {
    format: 'table',
    columns: ['parameter', 'weight_percent', 'scoring_type', 'evaluator_role'],
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.evaluation_criteria', 'deliverables'],
  },
  reward_structure: {
    format: 'custom',
    columns: ['prize_tier', 'amount', 'currency', 'payment_trigger'],
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.budget_reasonableness'],
  },
  complexity: {
    format: 'checkbox_single',
    masterDataTable: 'complexity_levels',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['deliverables', 'scope', 'phase_schedule', 'evaluation_criteria'],
  },
  ip_model: {
    format: 'checkbox_single',
    masterDataTable: 'ip_models',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.ip_model', 'spec.deliverables', 'maturity_level', 'reward_structure', 'scope', 'evaluation_criteria'],
  },
  legal_docs: {
    format: 'table',
    columns: ['document_type', 'status', 'lc_review_status', 'notes'],
    aiCanDraft: false,
    aiReviewEnabled: false,
    curatorCanEdit: false,
    aiUsesContext: [],
  },
  escrow_funding: {
    format: 'structured_fields',
    aiCanDraft: false,
    aiReviewEnabled: false,
    curatorCanEdit: false,
    aiUsesContext: [],
  },
  eligibility: {
    format: 'checkbox_multi',
    masterDataTable: 'solver_profiles',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.scope', 'spec.description'],
  },
  visibility: {
    format: 'checkbox_multi',
    masterDataTable: 'visibility_options',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['governance_profile', 'eligibility'],
  },
  domain_tags: {
    format: 'tag_input',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['scope', 'deliverables'],
  },
  phase_schedule: {
    format: 'schedule_table',
    columns: ['phase_name', 'start_date', 'end_date', 'duration_days', 'milestone', 'dependencies'],
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.phase_schedule', 'intake.scope'],
  },
  // ── Extended Brief subsections ──
  context_and_background: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.problem_statement', 'intake.scope', 'intake.beneficiaries_mapping'],
  },
  root_causes: {
    format: 'line_items',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.problem_statement', 'context_and_background'],
  },
  affected_stakeholders: {
    format: 'table',
    columns: ['stakeholder_name', 'role', 'impact_description', 'adoption_challenge'],
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.beneficiaries_mapping', 'context_and_background'],
  },
  current_deficiencies: {
    format: 'line_items',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.problem_statement', 'root_causes'],
  },
  preferred_approach: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.description', 'context_and_background', 'current_deficiencies'],
  },
  approaches_not_of_interest: {
    format: 'line_items',
    aiCanDraft: false,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: [],
  },
  // ── Extra sections (not in original 16-section spec but exist in app) ──
  hook: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['problem_statement', 'scope'],
  },
  extended_brief: {
    format: 'custom',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['problem_statement', 'scope', 'deliverables'],
  },
  solver_expertise: {
    format: 'custom',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['scope', 'deliverables', 'evaluation_criteria', 'eligibility', 'domain_tags'],
  },
};

/** Sections where the curator has no edit access */
export const LOCKED_SECTIONS = new Set(
  Object.entries(SECTION_FORMAT_CONFIG)
    .filter(([, cfg]) => !cfg.curatorCanEdit)
    .map(([key]) => key)
);

/** Sections where AI review is disabled */
export const AI_REVIEW_DISABLED_SECTIONS = new Set(
  Object.entries(SECTION_FORMAT_CONFIG)
    .filter(([, cfg]) => !cfg.aiReviewEnabled)
    .map(([key]) => key)
);

/** Ordered keys for Extended Brief subsections */
export const EXTENDED_BRIEF_SUBSECTION_KEYS = [
  'context_and_background',
  'root_causes',
  'affected_stakeholders',
  'current_deficiencies',
  'preferred_approach',
  'approaches_not_of_interest',
] as const;

/** Map subsection key → JSONB field inside extended_brief */
export const EXTENDED_BRIEF_FIELD_MAP: Record<string, string> = {
  context_and_background: 'context_background',
  root_causes: 'root_causes',
  affected_stakeholders: 'affected_stakeholders',
  current_deficiencies: 'current_deficiencies',
  preferred_approach: 'preferred_approach',
  approaches_not_of_interest: 'approaches_not_of_interest',
};

/** Get format config for a section, with safe fallback */
export function getSectionFormat(sectionKey: string): SectionFormatConfig | null {
  return SECTION_FORMAT_CONFIG[sectionKey] ?? null;
}
