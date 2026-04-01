/**
 * Pre-Flight Gate — validates mandatory section content before global AI review.
 *
 * Tier 1 (mandatory): blocks review if missing.
 * Tier 2 (recommended): warns but allows proceeding.
 */

import type { SectionKey } from '@/types/sections';

export interface PreFlightItem {
  sectionId: SectionKey;
  sectionName: string;
  reason: string;
}

export interface PreFlightResult {
  canProceed: boolean;
  missingMandatory: PreFlightItem[];
  warnings: PreFlightItem[];
}

const MANDATORY_SECTIONS: PreFlightItem[] = [
  {
    sectionId: 'problem_statement',
    sectionName: 'Problem Statement',
    reason: 'The core business problem. AI cannot infer this.',
  },
  {
    sectionId: 'maturity_level',
    sectionName: 'Maturity Level',
    reason: 'Blueprint/POC/Pilot determines the scale of all generated content.',
  },
  {
    sectionId: 'domain_tags',
    sectionName: 'Domain Tags',
    reason: 'Industry context for frameworks, benchmarks, and expertise requirements.',
  },
];

const RECOMMENDED_SECTIONS: PreFlightItem[] = [
  {
    sectionId: 'scope',
    sectionName: 'Scope',
    reason: 'Helps bound AI output. Will be AI-generated if empty — review carefully.',
  },
  {
    sectionId: 'expected_outcomes',
    sectionName: 'Expected Outcomes',
    reason: 'Guides KPI and evaluation generation. AI can derive from problem if missing.',
  },
  {
    sectionId: 'context_and_background',
    sectionName: 'Context & Background',
    reason: 'Industry context helps specificity. AI uses org profile as fallback.',
  },
];

function getSectionContent(
  sections: Record<string, string | null | unknown>,
  key: string,
): string {
  const val = sections[key];
  if (val == null) return '';
  if (typeof val === 'string') return val.trim();
  if (typeof val === 'object') {
    const str = JSON.stringify(val);
    // Empty arrays or objects with no real content
    if (str === '[]' || str === '{}' || str === 'null') return '';
    return str;
  }
  return String(val).trim();
}

/**
 * Parse reward_structure JSONB and extract budget_max.
 * Returns 0 if not parseable or not present.
 */
function parseRewardStructureBudgetMax(
  sections: Record<string, string | null | unknown>,
): number {
  const val = sections['reward_structure'];
  if (val == null) return 0;
  try {
    const obj = typeof val === 'string' ? JSON.parse(val) : val;
    if (typeof obj === 'object' && obj !== null) {
      const budgetMax = (obj as Record<string, unknown>).budget_max;
      if (typeof budgetMax === 'number' && budgetMax > 0) return budgetMax;
      if (typeof budgetMax === 'string') {
        const parsed = parseFloat(budgetMax);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    }
  } catch {
    // Invalid JSON — treat as missing
  }
  return 0;
}

/** Maps section keys to their parent tab label for navigation context */
export const SECTION_TO_TAB: Record<string, string> = {
  problem_statement: 'Problem Definition',
  scope: 'Problem Definition',
  context_and_background: 'Problem Definition',
  expected_outcomes: 'Problem Definition',
  root_causes: 'Challenge Context',
  affected_stakeholders: 'Challenge Context',
  current_deficiencies: 'Challenge Context',
  preferred_approach: 'Challenge Context',
  approaches_not_of_interest: 'Challenge Context',
  deliverables: 'Scope & Complexity',
  maturity_level: 'Scope & Complexity',
  complexity_assessment: 'Scope & Complexity',
  solver_expertise: 'Solvers & Schedule',
  eligibility: 'Solvers & Schedule',
  phase_schedule: 'Solvers & Schedule',
  submission_guidelines: 'Solvers & Schedule',
  evaluation_criteria: 'Evaluation & Rewards',
  reward_structure: 'Evaluation & Rewards',
  ip_model: 'Evaluation & Rewards',
  challenge_hook: 'Publish & Discover',
  visibility: 'Publish & Discover',
  domain_tags: 'Publish & Discover',
};

export function preFlightCheck(
  sections: Record<string, string | null | unknown>,
  operatingModel?: string,
): PreFlightResult {
  const missingMandatory: PreFlightItem[] = [];
  const warnings: PreFlightItem[] = [];

  for (const s of MANDATORY_SECTIONS) {
    const content = getSectionContent(sections, s.sectionId);
    if (content.length < 50) {
      missingMandatory.push(s);
    }
  }

  for (const s of RECOMMENDED_SECTIONS) {
    const content = getSectionContent(sections, s.sectionId);
    if (content.length < 30) {
      warnings.push({
        ...s,
        reason: s.reason + ' AI will generate this — review the output carefully.',
      });
    }
  }

  // Marketplace budget check: MP mode requires a valid budget_max > 0
  const normalizedModel = (operatingModel ?? '').toLowerCase();
  if (normalizedModel === 'marketplace' || normalizedModel === 'mp') {
    const budgetMax = parseRewardStructureBudgetMax(sections);
    if (budgetMax <= 0) {
      missingMandatory.push({
        sectionId: 'reward_structure' as SectionKey,
        sectionName: 'Reward Structure (Budget)',
        reason: 'Marketplace challenges require a budget maximum > 0. Set the budget in Evaluation & Rewards.',
      });
    }
  }

  return {
    canProceed: missingMandatory.length === 0,
    missingMandatory,
    warnings,
  };
}
