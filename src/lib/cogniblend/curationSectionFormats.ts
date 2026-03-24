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
  submission_guidelines: {
    format: 'rich_text',
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
    columns: ['criterion_name', 'weight_percentage', 'scoring_type', 'evaluator_role'],
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.evaluation_criteria', 'deliverables'],
  },
  reward_structure: {
    format: 'structured_fields',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['intake.budget_reasonableness'],
  },
  complexity: {
    format: 'custom',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['deliverables', 'scope', 'phase_schedule', 'evaluation_criteria'],
  },
  ip_model: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['spec.ip_model', 'spec.deliverables'],
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
  visibility_eligibility: {
    format: 'rich_text',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['governance_profile', 'eligibility'],
  },
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
  submission_deadline: {
    format: 'date',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['phase_schedule'],
  },
  challenge_visibility: {
    format: 'select',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['governance_profile'],
  },
  effort_level: {
    format: 'radio',
    aiCanDraft: true,
    aiReviewEnabled: true,
    curatorCanEdit: true,
    aiUsesContext: ['deliverables', 'scope', 'phase_schedule'],
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

/** Get format config for a section, with safe fallback */
export function getSectionFormat(sectionKey: string): SectionFormatConfig | null {
  return SECTION_FORMAT_CONFIG[sectionKey] ?? null;
}
