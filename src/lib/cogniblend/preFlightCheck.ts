/**
 * Pre-Flight Gate — validates mandatory section content before global AI review.
 *
 * Tier 1 (mandatory): blocks review if missing.
 * Tier 2 (recommended): warns but allows proceeding.
 * Gap 3: Maturity-budget alignment validation.
 * Gap 4: Quality prediction based on scope/outcomes presence.
 */

import type { SectionKey } from '@/types/sections';
import { scoreDomainCoverage } from './domainCoverageScorer';
import { scoreOrgContext } from './orgContextScorer';

export interface PreFlightItem {
  sectionId: SectionKey;
  sectionName: string;
  reason: string;
}

export interface QualityPrediction {
  /** Estimated quality percentage (65–95) */
  qualityPct: number;
  /** Estimated sections needing manual edits */
  sectionsToEdit: string;
  /** Human-readable explanation */
  label: string;
  /** Which recommended sections are present */
  hasScope: boolean;
  hasOutcomes: boolean;
}

export interface PreFlightResult {
  canProceed: boolean;
  missingMandatory: PreFlightItem[];
  warnings: PreFlightItem[];
  /** Maturity-budget alignment errors (blocking) */
  budgetAlignmentErrors: PreFlightItem[];
  /** Maturity-budget alignment warnings (non-blocking) */
  budgetAlignmentWarnings: PreFlightItem[];
  /** Quality prediction based on recommended section presence */
  qualityPrediction: QualityPrediction;
  /** Domain coverage score (0-100) and coverage level */
  domainCoverage?: { score: number; coverageLevel: string; recommendation: string };
  /** Org context score (0-100) and missing fields */
  orgContext?: { score: number; missingFields: string[]; recommendation: string };
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

/**
 * Gap 3: Maturity-budget alignment ranges.
 * Below minimum → ERROR (blocks AI). Above range for Blueprint → WARNING.
 */
const MATURITY_BUDGET_RANGES: Record<string, { min: number; max: number }> = {
  blueprint: { min: 5000, max: 75000 },
  poc: { min: 5000, max: 200000 },
  pilot: { min: 25000, max: Infinity },
  prototype: { min: 5000, max: 150000 },
  demo: { min: 5000, max: 100000 },
};

function normalizeMaturity(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .toLowerCase()
    .replace(/^solution[_\s]*/i, '')
    .trim();
}

function checkMaturityBudgetAlignment(
  sections: Record<string, string | null | unknown>,
): { errors: PreFlightItem[]; warnings: PreFlightItem[] } {
  const errors: PreFlightItem[] = [];
  const warnings: PreFlightItem[] = [];

  const maturityRaw = getSectionContent(sections, 'maturity_level');
  const maturity = normalizeMaturity(maturityRaw);
  const budgetMax = parseRewardStructureBudgetMax(sections);

  // Skip check if no budget or no maturity
  if (!maturity || budgetMax <= 0) return { errors, warnings };

  const range = MATURITY_BUDGET_RANGES[maturity];
  if (!range) return { errors, warnings };

  if (budgetMax < range.min) {
    errors.push({
      sectionId: 'reward_structure' as SectionKey,
      sectionName: 'Reward Structure (Budget)',
      reason: `Budget $${budgetMax.toLocaleString()} is below the minimum $${range.min.toLocaleString()} for ${maturity} maturity level.`,
    });
  }

  if (budgetMax > range.max && range.max !== Infinity) {
    warnings.push({
      sectionId: 'reward_structure' as SectionKey,
      sectionName: 'Reward Structure (Budget)',
      reason: `Budget $${budgetMax.toLocaleString()} exceeds the typical $${range.max.toLocaleString()} ceiling for ${maturity}. Consider a higher maturity level.`,
    });
  }

  return { errors, warnings };
}

/**
 * Gap 4: Compute quality prediction based on scope + outcomes presence.
 */
function computeQualityPrediction(
  sections: Record<string, string | null | unknown>,
): QualityPrediction {
  const scopeContent = getSectionContent(sections, 'scope');
  const outcomesContent = getSectionContent(sections, 'expected_outcomes');
  const hasScope = scopeContent.length >= 30;
  const hasOutcomes = outcomesContent.length >= 30;

  if (hasScope && hasOutcomes) {
    return {
      qualityPct: 95,
      sectionsToEdit: '2–3',
      label: 'Excellent — both Scope and Outcomes are provided',
      hasScope,
      hasOutcomes,
    };
  }
  if (hasOutcomes) {
    return {
      qualityPct: 85,
      sectionsToEdit: '5–7',
      label: 'Good — Outcomes provided, Scope will be AI-generated',
      hasScope,
      hasOutcomes,
    };
  }
  if (hasScope) {
    return {
      qualityPct: 80,
      sectionsToEdit: '5–7',
      label: 'Fair — Scope provided, Outcomes will be AI-generated',
      hasScope,
      hasOutcomes,
    };
  }
  return {
    qualityPct: 65,
    sectionsToEdit: '10–15',
    label: 'Both Scope and Outcomes are missing — expect more editing',
    hasScope,
    hasOutcomes,
  };
}

export function preFlightCheck(
  sections: Record<string, string | null | unknown>,
  operatingModel?: string,
  orgProfile?: Record<string, any> | null,
): PreFlightResult {
  const missingMandatory: PreFlightItem[] = [];
  const warnings: PreFlightItem[] = [];

  // Per-section minimum length thresholds (enum codes like "POC" are short but valid)
  const SECTION_MIN_LENGTH: Record<string, number> = {
    maturity_level: 2,
    domain_tags: 3,
    problem_statement: 50,
  };

  for (const s of MANDATORY_SECTIONS) {
    const content = getSectionContent(sections, s.sectionId);
    const minLen = SECTION_MIN_LENGTH[s.sectionId] ?? 50;
    if (content.length < minLen) {
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

  // Gap 3: Maturity-budget alignment
  const alignment = checkMaturityBudgetAlignment(sections);

  // Gap 4: Quality prediction
  const qualityPrediction = computeQualityPrediction(sections);

  // Phase 10: Domain coverage scoring
  let domainCoverageResult: PreFlightResult['domainCoverage'];
  const domainContent = getSectionContent(sections, 'domain_tags');
  if (domainContent.length > 0) {
    try {
      const tags = typeof sections.domain_tags === 'string'
        ? JSON.parse(sections.domain_tags)
        : sections.domain_tags;
      if (Array.isArray(tags)) {
        const coverage = scoreDomainCoverage(tags);
        domainCoverageResult = {
          score: coverage.score,
          coverageLevel: coverage.coverageLevel,
          recommendation: coverage.recommendation,
        };
        // Emit at most one domain_tags warning — prioritize most actionable
        if (coverage.coverageLevel === 'thin') {
          warnings.push({
            sectionId: 'domain_tags' as SectionKey,
            sectionName: 'Domain Tags',
            reason: `Thin domain coverage: ${coverage.thinDomains.join(', ')}. AI has limited reference data — expect more curator edits.`,
          });
        } else if (tags.length > 5) {
          warnings.push({
            sectionId: 'domain_tags' as SectionKey,
            sectionName: 'Domain Tags',
            reason: `${tags.length} domain tags selected. Broad domain coverage may reduce AI specificity — consider narrowing to 3-5 core domains.`,
          });
        } else if (coverage.coverageLevel === 'moderate') {
          warnings.push({
            sectionId: 'domain_tags' as SectionKey,
            sectionName: 'Domain Tags',
            reason: coverage.recommendation,
          });
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Phase 10: Org context scoring
  let orgContextResult: PreFlightResult['orgContext'];
  if (orgProfile) {
    const orgScore = scoreOrgContext(orgProfile);
    orgContextResult = {
      score: orgScore.score,
      missingFields: orgScore.missingFields,
      recommendation: orgScore.recommendation,
    };
    if (orgScore.score < 50) {
      warnings.push({
        sectionId: 'problem_statement' as SectionKey, // closest relevant section
        sectionName: 'Organization Context',
        reason: orgScore.recommendation,
      });
    }
  }

  return {
    canProceed: missingMandatory.length === 0 && alignment.errors.length === 0,
    missingMandatory,
    warnings,
    budgetAlignmentErrors: alignment.errors,
    budgetAlignmentWarnings: alignment.warnings,
    qualityPrediction,
    domainCoverage: domainCoverageResult,
    orgContext: orgContextResult,
  };
}
