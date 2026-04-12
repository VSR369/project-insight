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
  // Wave 1: Foundation — no upstream deps
  context_and_background: ['root_causes', 'affected_stakeholders', 'current_deficiencies'],
  problem_statement: ['root_causes', 'affected_stakeholders', 'current_deficiencies', 'scope', 'deliverables', 'solver_expertise', 'expected_outcomes', 'hook', 'solution_type', 'domain_tags'],
  scope: ['deliverables', 'solver_expertise', 'eligibility', 'domain_tags', 'complexity', 'data_resources_provided'],
  expected_outcomes: ['evaluation_criteria', 'deliverables', 'success_metrics_kpis'],
  // Wave 2: Analysis
  root_causes: ['preferred_approach', 'current_deficiencies'],
  current_deficiencies: ['preferred_approach'],
  preferred_approach: ['approaches_not_of_interest'],
  affected_stakeholders: [],
  approaches_not_of_interest: [],
  // Wave 3: Specification
  solution_type: ['deliverables', 'complexity', 'solver_expertise', 'domain_tags'],
  deliverables: ['complexity', 'solver_expertise', 'submission_guidelines', 'evaluation_criteria', 'maturity_level', 'data_resources_provided'],
  maturity_level: ['complexity', 'phase_schedule', 'reward_structure'],
  data_resources_provided: ['submission_guidelines'],
  success_metrics_kpis: ['evaluation_criteria'],
  // Wave 4: Assessment
  complexity: ['phase_schedule', 'reward_structure', 'solver_expertise', 'escrow_funding'],
  solver_expertise: ['eligibility'],
  eligibility: [],
  // Wave 5: Execution
  phase_schedule: ['submission_guidelines', 'escrow_funding'],
  evaluation_criteria: ['submission_guidelines'],
  submission_guidelines: [],
  reward_structure: ['escrow_funding'],
  ip_model: ['legal_docs'],
  // Wave 6: Presentation & Compliance
  hook: [],
  visibility: [],
  domain_tags: [],
  escrow_funding: [],
  legal_docs: [],
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

/* ── Upstream dependencies (inverse of DIRECT_DEPENDENCIES) ── */

/**
 * Returns the set of section keys that the given section depends on
 * (i.e., sections whose content should exist before this one).
 * This is the inverse of DIRECT_DEPENDENCIES.
 */
let _upstreamCache: Map<string, SectionKey[]> | null = null;

function buildUpstreamMap(): Map<string, SectionKey[]> {
  if (_upstreamCache) return _upstreamCache;
  const map = new Map<string, SectionKey[]>();
  for (const [parent, children] of Object.entries(DIRECT_DEPENDENCIES)) {
    for (const child of children ?? []) {
      const existing = map.get(child) ?? [];
      existing.push(parent as SectionKey);
      map.set(child, existing);
    }
  }
  _upstreamCache = map;
  return map;
}

export function getUpstreamDependencies(sectionKey: SectionKey | string): SectionKey[] {
  const map = buildUpstreamMap();
  return map.get(sectionKey) ?? [];
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
  solver_expertise: 'Solution Provider Expertise Requirements',
  data_resources_provided: 'Data & Resources Provided',
  success_metrics_kpis: 'Success Metrics & KPIs',
  solution_type: 'Solution Type',
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
