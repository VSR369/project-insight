/**
 * creatorFormSchema — Zod schema builder for the Creator challenge form.
 * Governance-mode aware: QUICK (5 req), STRUCTURED (8 req), CONTROLLED (12 req).
 *
 * Field names align with md_governance_field_rules keys:
 *   currency_code, platinum_award, weighted_criteria, deliverables_list
 */

import { z } from 'zod';
import type { GovernanceMode } from '@/lib/governanceMode';

const stakeholderRowSchema = z.object({
  stakeholder_name: z.string(),
  role: z.string(),
  impact_description: z.string(),
  adoption_challenge: z.string(),
});

const criterionSchema = z.object({
  name: z.string().min(1, 'Criterion name required'),
  weight: z.coerce.number().min(0).max(100),
});

export function buildCreatorSchema(governanceMode: GovernanceMode, engagementModel: string) {
  const isQuick = governanceMode === 'QUICK';
  const isControlled = governanceMode === 'CONTROLLED';
  const isStructured = governanceMode === 'STRUCTURED';

  const problemMin = isQuick ? 100 : isControlled ? 500 : 300;

  // QUICK & STRUCTURED: scope hidden → optional; CONTROLLED: required
  const scopeRule = isQuick || isStructured
    ? (isStructured
      ? z.string().min(150, 'At least 150 characters required')
      : z.string().optional().default(''))
    : z.string().min(200, 'At least 200 characters required');

  // QUICK & STRUCTURED: ip_model auto/hidden → optional
  const ipRule = isControlled
    ? z.string().min(1, 'Please select an IP model')
    : z.string().optional().default('IP-NEL');

  // QUICK: maturity hidden → optional
  const maturityRule = isQuick
    ? z.string().optional().default('')
    : z.string().min(1, 'Please select a solution type');

  // QUICK & STRUCTURED: expected_outcomes hidden → optional
  const outcomesRule = isControlled
    ? z.array(z.string()).min(1, 'Add at least one expected outcome')
    : z.array(z.string()).optional().default([]);

  // QUICK: weighted_criteria hidden → optional
  const weightedCriteriaRule = isQuick
    ? z.array(criterionSchema).optional().default([])
    : z.array(criterionSchema).min(1, 'Add at least one evaluation criterion');

  // CONTROLLED: context fields required; STRUCTURED: optional; QUICK: hidden
  const contextStringRule = isControlled
    ? z.string().min(1, 'Required for Controlled governance')
    : z.string().optional().default('');

  // CONTROLLED: line items required; others: optional
  const lineItemRule = isControlled
    ? z.array(z.string()).min(1, 'Required for Controlled governance')
    : z.array(z.string()).default(['']);

  // CONTROLLED: stakeholders required; others: optional
  const stakeholderRule = isControlled
    ? z.array(stakeholderRowSchema).min(1, 'Required for Controlled governance')
    : z.array(stakeholderRowSchema).default([]);

  // CONTROLLED: hook required; others: optional
  const hookRule = isControlled
    ? z.string().min(1, 'One-line summary required').max(300)
    : z.string().optional().default('');

  const evaluationMethodRule = z.enum(['SINGLE', 'DELPHI']).default('SINGLE');
  const evaluatorCountRule = isQuick
    ? z.coerce.number().default(1)
    : z.coerce.number().min(1).max(5).default(1);

  const base = z.object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
    hook: hookRule,
    problem_statement: z.string().min(problemMin, `At least ${problemMin} characters required`),
    scope: scopeRule,
    maturity_level: maturityRule,
    solution_maturity_id: z.string().optional().default(''),
    industry_segment_id: z.string().optional().default(''),
    domain_tags: z.array(z.string()).min(1, 'Add at least one domain tag').default([]),
    currency_code: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
    platinum_award: z.coerce.number().min(0).default(0),
    ip_model: ipRule,
    expected_outcomes: outcomesRule,
    weighted_criteria: weightedCriteriaRule,
    deliverables_list: z.array(z.string()).optional().default([]),
    context_background: contextStringRule,
    preferred_approach: lineItemRule,
    approaches_not_of_interest: lineItemRule,
    affected_stakeholders: stakeholderRule,
    current_deficiencies: lineItemRule,
    root_causes: lineItemRule,
    expected_timeline: isControlled
      ? z.string().min(1, 'Timeline is required')
      : z.string().optional().default(''),
    solver_audience: z.enum(['ALL', 'INTERNAL', 'EXTERNAL']).default('ALL'),
    evaluation_method: evaluationMethodRule,
    evaluator_count: evaluatorCountRule,
  });

  if (engagementModel === 'MP') {
    return base.refine((data) => data.platinum_award > 0, {
      message: 'Top prize amount is required for Marketplace',
      path: ['platinum_award'],
    });
  }

  return base;
}

export type CreatorFormValues = {
  title: string;
  hook: string;
  problem_statement: string;
  scope: string;
  maturity_level: string;
  solution_maturity_id: string;
  domain_tags: string[];
  currency_code: 'USD' | 'EUR' | 'GBP' | 'INR';
  platinum_award: number;
  ip_model: string;
  expected_outcomes: string[];
  weighted_criteria: Array<{ name: string; weight: number }>;
  deliverables_list: string[];
  context_background: string;
  preferred_approach: string[];
  approaches_not_of_interest: string[];
  affected_stakeholders: Array<{
    stakeholder_name: string;
    role: string;
    impact_description: string;
    adoption_challenge: string;
  }>;
  current_deficiencies: string[];
  root_causes: string[];
  expected_timeline: string;
  industry_segment_id: string;
  solver_audience: 'ALL' | 'INTERNAL' | 'EXTERNAL';
  evaluation_method: 'SINGLE' | 'DELPHI';
  evaluator_count: number;
};

export function toFormMaturityCode(value: string | null | undefined): string {
  if (!value) return '';
  const upper = value.toUpperCase();
  if (upper.startsWith('SOLUTION_')) return upper;
  if (upper === 'PILOT') return upper;
  return `SOLUTION_${upper}`;
}
