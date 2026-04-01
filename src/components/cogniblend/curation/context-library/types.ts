/**
 * Shared types and constants for Context Library sub-components.
 */

import type { ContextSource } from '@/hooks/cogniblend/useContextLibrary';

export type { ContextSource };

export const SECTION_LABELS: Record<string, string> = {
  problem_statement: 'Problem Statement',
  context_and_background: 'Context & Background',
  deliverables: 'Deliverables',
  data_resources_provided: 'Data & Resources',
  evaluation_criteria: 'Evaluation Criteria',
  scope: 'Scope',
  success_metrics_kpis: 'Success Metrics',
  affected_stakeholders: 'Stakeholders',
  expected_outcomes: 'Expected Outcomes',
  phase_schedule: 'Timeline',
  reward_structure: 'Reward Structure',
  solver_expertise: 'Solver Expertise',
  submission_guidelines: 'Submission Guidelines',
  ip_model: 'IP & Licensing',
  current_deficiencies: 'Deficiencies',
  root_causes: 'Root Causes',
  preferred_approach: 'Preferred Approach',
  approaches_not_of_interest: 'Excluded Approaches',
};

export function displayName(s: ContextSource): string {
  return s.display_name || s.url_title || s.file_name || s.source_url?.substring(0, 60) || 'Untitled';
}

export function matchSource(s: ContextSource, term: string): boolean {
  return (
    (s.display_name || s.file_name || s.url_title || s.source_url || '').toLowerCase().includes(term) ||
    (s.section_key || '').toLowerCase().includes(term) ||
    (s.resource_type || '').toLowerCase().includes(term)
  );
}
