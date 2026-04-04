/**
 * creatorFormSchema — Zod schema builder for the Creator challenge form.
 * Governance-mode aware: QUICK (5 req), STRUCTURED (8 req), CONTROLLED (12 req).
 */

import { z } from 'zod';
import type { GovernanceMode } from '@/lib/governanceMode';

const stakeholderRowSchema = z.object({
  stakeholder_name: z.string(),
  role: z.string(),
  impact_description: z.string(),
  adoption_challenge: z.string(),
});

export function buildCreatorSchema(governanceMode: GovernanceMode, engagementModel: string) {
  const isQuick = governanceMode === 'QUICK';
  const isControlled = governanceMode === 'CONTROLLED';

  const problemMin = isQuick ? 100 : isControlled ? 500 : 300;
  const scopeRule = isQuick
    ? z.string().optional().default('')
    : z.string().min(isControlled ? 200 : 150, `At least ${isControlled ? 200 : 150} characters required`);
  const ipRule = isQuick
    ? z.string().optional().default('IP-NEL')
    : z.string().min(1, 'Please select an IP model');
  const outcomesRule = z.array(z.string()).min(1, 'Add at least one expected outcome');
  const lineItemRule = isControlled
    ? z.array(z.string()).min(1, 'Required for Controlled governance')
    : z.array(z.string()).default(['']);
  const contextStringRule = isControlled
    ? z.string().min(1, 'Required for Controlled governance')
    : z.string().optional().default('');
  const stakeholderRule = isControlled
    ? z.array(stakeholderRowSchema).min(1, 'Required for Controlled governance')
    : z.array(stakeholderRowSchema).default([]);
  const hookRule = isControlled
    ? z.string().min(1, 'One-line summary required').max(300)
    : z.string().optional().default('');

  const base = z.object({
    title: z.string().trim().min(1, 'Title is required').max(200, 'Max 200 characters'),
    hook: hookRule,
    problem_statement: z.string().min(problemMin, `At least ${problemMin} characters required`),
    scope: scopeRule,
    maturity_level: z.string().min(1, 'Please select a solution type'),
    solution_maturity_id: z.string().optional().default(''),
    industry_segment_id: z.string().optional().default(''),
    domain_tags: z.array(z.string()).min(1, 'Select at least 1 domain').max(3, 'Max 3 domains'),
    currency: z.enum(['USD', 'EUR', 'GBP', 'INR']).default('USD'),
    budget_min: z.coerce.number().min(0).default(0),
    budget_max: z.coerce.number().min(0).default(0),
    ip_model: ipRule,
    expected_outcomes: outcomesRule,
    context_background: contextStringRule,
    preferred_approach: lineItemRule,
    approaches_not_of_interest: lineItemRule,
    affected_stakeholders: stakeholderRule,
    current_deficiencies: lineItemRule,
    root_causes: lineItemRule,
    expected_timeline: isControlled
      ? z.string().min(1, 'Timeline is required')
      : z.string().optional().default(''),
  });

  if (engagementModel === 'MP') {
    return base
      .refine((data) => data.budget_max > 0, {
        message: 'Maximum budget is required for Marketplace',
        path: ['budget_max'],
      })
      .refine((data) => data.budget_min < data.budget_max, {
        message: 'Min must be less than max',
        path: ['budget_min'],
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
  currency: 'USD' | 'EUR' | 'GBP' | 'INR';
  budget_min: number;
  budget_max: number;
  ip_model: string;
  expected_outcomes: string[];
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
};

export function toFormMaturityCode(value: string | null | undefined): string {
  if (!value) return '';
  const upper = value.toUpperCase();
  if (upper.startsWith('SOLUTION_')) return upper;
  if (upper === 'PILOT') return upper;
  return `SOLUTION_${upper}`;
}
