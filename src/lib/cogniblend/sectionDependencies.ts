/**
 * Section dependency map for staleness tracking.
 *
 * Defines which downstream sections become potentially inconsistent
 * when an upstream section is edited.
 *
 * Keys use codebase section keys (e.g. "complexity" not "complexity_assessment").
 */

import type { SectionKey } from '@/types/sections';

/* ── Direct dependency map ── */

export const DIRECT_DEPENDENCIES: Partial<Record<SectionKey, SectionKey[]>> = {
  context_and_background: ['root_causes', 'affected_stakeholders', 'current_deficiencies'],
  problem_statement: ['root_causes', 'affected_stakeholders', 'current_deficiencies', 'scope', 'deliverables', 'solver_expertise', 'expected_outcomes', 'hook'],
  scope: ['deliverables', 'solver_expertise', 'eligibility', 'submission_guidelines', 'domain_tags', 'complexity'],
  expected_outcomes: ['evaluation_criteria', 'deliverables'],
  root_causes: ['preferred_approach', 'current_deficiencies'],
  current_deficiencies: ['preferred_approach', 'deliverables'],
  preferred_approach: ['approaches_not_of_interest'],
  deliverables: ['complexity', 'solver_expertise', 'submission_guidelines', 'evaluation_criteria', 'maturity_level'],
  maturity_level: ['complexity', 'phase_schedule', 'reward_structure'],
  complexity: ['phase_schedule', 'reward_structure', 'solver_expertise', 'submission_guidelines', 'escrow_funding'],
  solver_expertise: ['eligibility'],
  eligibility: [],
  phase_schedule: ['submission_guidelines', 'escrow_funding', 'evaluation_criteria'],
  submission_guidelines: [],
  evaluation_criteria: [],
  reward_structure: ['escrow_funding'],
  ip_model: ['legal_docs'],
  escrow_funding: [],
  legal_docs: [],
  hook: [],
  visibility: [],
  domain_tags: [],
  affected_stakeholders: [],
  approaches_not_of_interest: [],
  data_resources_provided: ['submission_guidelines'],
  success_metrics_kpis: ['evaluation_criteria'],
};

/* ── Transitive dependents via BFS ── */

export function getTransitiveDependents(changedSectionKey: SectionKey): SectionKey[] {
  const stale = new Set<SectionKey>();
  const queue: SectionKey[] = [changedSectionKey];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directDeps = DIRECT_DEPENDENCIES[current] ?? [];
    for (const dep of directDeps) {
      if (!stale.has(dep)) {
        stale.add(dep);
        queue.push(dep);
      }
    }
  }

  return Array.from(stale);
}

/* ── Human-readable display names ── */

const SECTION_DISPLAY_NAMES: Partial<Record<SectionKey, string>> = {
  problem_statement: 'Problem Statement',
  scope: 'Scope',
  deliverables: 'Deliverables',
  submission_guidelines: 'Submission Guidelines',
  expected_outcomes: 'Expected Outcomes',
  maturity_level: 'Maturity Level',
  evaluation_criteria: 'Evaluation Criteria',
  reward_structure: 'Reward Structure',
  complexity: 'Complexity Assessment',
  ip_model: 'IP Model',
  legal_docs: 'Legal Documents',
  escrow_funding: 'Escrow & Funding',
  eligibility: 'Eligibility',
  visibility: 'Visibility',
  domain_tags: 'Domain Tags',
  phase_schedule: 'Phase Schedule',
  hook: 'Challenge Hook',
  context_and_background: 'Context & Background',
  root_causes: 'Root Causes',
  affected_stakeholders: 'Affected Stakeholders',
  current_deficiencies: 'Current Deficiencies',
  preferred_approach: 'Preferred Approach',
  approaches_not_of_interest: 'Approaches NOT of Interest',
  solver_expertise: 'Solver Expertise Requirements',
  data_resources_provided: 'Data & Resources Provided',
  success_metrics_kpis: 'Success Metrics & KPIs',
};

export function getSectionDisplayName(key: SectionKey | string): string {
  return SECTION_DISPLAY_NAMES[key as SectionKey] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* ── Locked section role labels ── */

const LOCKED_SECTION_ROLES: Partial<Record<SectionKey, string>> = {
  legal_docs: 'LC',
  escrow_funding: 'FC',
};

export function getLockedSectionRole(key: SectionKey | string): string | null {
  return LOCKED_SECTION_ROLES[key as SectionKey] ?? null;
}
