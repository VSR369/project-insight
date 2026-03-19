/**
 * Zod schema for the Challenge Creation wizard form.
 * Covers all 7 steps. Validation severity depends on governance mode.
 */

import { z } from 'zod';
import type { GovernanceMode } from '@/lib/governanceMode';

/* ── Governance-aware min lengths ──────────────────────── */
export const PROBLEM_MIN_CONTROLLED = 500;
export const PROBLEM_MIN_STRUCTURED = 300;
export const PROBLEM_MIN_QUICK = 200;
export const SCOPE_MIN_CONTROLLED = 200;
export const SCOPE_MIN_STRUCTURED = 150;
export const SCOPE_MIN_QUICK = 100;
export const TITLE_MAX = 200;

/** Legacy aliases for backward compatibility */
export const PROBLEM_MIN_ENTERPRISE = PROBLEM_MIN_CONTROLLED;
export const PROBLEM_MIN_LIGHTWEIGHT = PROBLEM_MIN_QUICK;
export const SCOPE_MIN_ENTERPRISE = SCOPE_MIN_CONTROLLED;
export const SCOPE_MIN_LIGHTWEIGHT = SCOPE_MIN_QUICK;

/**
 * Creates a governance-aware challenge form schema.
 * Accepts a GovernanceMode or legacy boolean (isLightweight) for backward compat.
 */
export function createChallengeFormSchema(modeOrLightweight: GovernanceMode | boolean) {
  const mode: GovernanceMode =
    typeof modeOrLightweight === 'boolean'
      ? (modeOrLightweight ? 'QUICK' : 'STRUCTURED')
      : modeOrLightweight;

  const problemMin = mode === 'QUICK' ? PROBLEM_MIN_QUICK
    : mode === 'STRUCTURED' ? PROBLEM_MIN_STRUCTURED
    : PROBLEM_MIN_CONTROLLED;

  const scopeMin = mode === 'QUICK' ? SCOPE_MIN_QUICK
    : mode === 'STRUCTURED' ? SCOPE_MIN_STRUCTURED
    : SCOPE_MIN_CONTROLLED;

  return z.object({
    // Step 1 — Challenge Brief
    title: z.string().min(1, 'Title is required').max(TITLE_MAX, `Title cannot exceed ${TITLE_MAX} characters`).trim(),
    hook: z.string().max(300, 'Hook cannot exceed 300 characters').optional().or(z.literal('')),
    description: z.string().max(2000).optional().or(z.literal('')),
    problem_statement: z.string()
      .min(problemMin, `Problem statement must be at least ${problemMin} characters`)
      .max(5000, 'Max 5000 characters')
      .trim(),
    scope: isLightweight
      ? z.string().max(3000).optional().or(z.literal(''))
      : z.string()
          .min(scopeMin, `Scope must be at least ${scopeMin} characters`)
          .max(3000, 'Max 3000 characters')
          .trim(),
    domain_tags: z.array(z.string()).min(1, 'At least one domain tag is required'),
    taxonomy_tags: z.string().max(500).optional().or(z.literal('')),
    maturity_level: z.enum(['blueprint', 'poc', 'prototype', 'pilot'], {
      errorMap: () => ({ message: 'Please select a maturity level' }),
    }),

    // Step 1 — Rich-text fields
    context_background: z.string().max(5000).optional().or(z.literal('')),
    detailed_description: z.string().max(5000).optional().or(z.literal('')),
    root_causes: z.string().max(5000).optional().or(z.literal('')),
    affected_stakeholders: z.string().max(5000).optional().or(z.literal('')),
    current_deficiencies: z.string().max(5000).optional().or(z.literal('')),
    expected_outcomes: z.string().max(5000).optional().or(z.literal('')),
    preferred_approach: z.string().max(5000).optional().or(z.literal('')),
    approaches_not_of_interest: z.string().max(5000).optional().or(z.literal('')),

    // Step 1 — Selectors
    industry_segment_id: z.string().optional().or(z.literal('')),
    experience_countries: z.array(z.string()).default([]),

    // Step 1 — Deliverables
    deliverables_list: z.array(z.string()).default(['']),
    submission_guidelines: z.string().max(3000).optional().or(z.literal('')),

    // Step 2 — Evaluation
    weighted_criteria: z.array(z.object({
      name: z.string().min(1, 'Criterion name is required').max(200),
      weight: z.number().min(0).max(100),
      description: z.string().max(500).optional().or(z.literal('')),
      rubrics: z.object({
        score_1: z.string().max(500).optional().or(z.literal('')),
        score_2: z.string().max(500).optional().or(z.literal('')),
        score_3: z.string().max(500).optional().or(z.literal('')),
        score_4: z.string().max(500).optional().or(z.literal('')),
        score_5: z.string().max(500).optional().or(z.literal('')),
      }).optional(),
    })).min(1, 'At least one criterion is required'),

    // Step 3 — Rewards & Payment
    reward_type: z.enum(['monetary', 'non_monetary']).default('monetary'),
    reward_description: z.string().max(2000).optional().or(z.literal('')),
    currency_code: z.string().default('USD'),
    platinum_award: z.number().min(0).default(0),
    gold_award: z.number().min(0).default(0),
    silver_award: z.number().min(0).optional(),
    num_rewarded_solutions: z.enum(['1', '2', '3']).default('3'),
    effort_level: z.string().optional().or(z.literal('')),
    rejection_fee_pct: z.number().min(5).max(20).default(10),
    payment_mode: z.enum(['escrow', 'direct']).default('escrow'),
    payment_milestones: z.array(z.object({
      name: z.string().min(1, 'Milestone name is required').max(200),
      pct: z.number().min(0).max(100),
      trigger: z.string().max(200).optional().or(z.literal('')),
    })).default([]),
    ip_model: z.string().optional().or(z.literal('')),

    // Step 4 — Timeline
    submission_deadline: z.string().optional().or(z.literal('')),
    expected_timeline: z.string().max(200).optional().or(z.literal('')),
    review_duration: z.number().int().min(1).max(90).optional(),
    phase_notes: z.string().max(2000).optional().or(z.literal('')),
    phase_durations: z.record(z.string(), z.number().min(1).max(365)).optional(),
    complexity_notes: z.string().max(2000).optional().or(z.literal('')),
    complexity_params: z.record(z.string(), z.number().min(0).max(10)).optional(),

    // Step 5 — Provider Eligibility
    eligible_participation_modes: z.array(z.string()).default([]),
    solver_eligibility_id: z.string().optional().or(z.literal('')),
    solver_eligibility_ids: z.array(z.string()).default([]),
    challenge_visibility: z.string().optional().or(z.literal('')),
    challenge_enrollment: z.string().optional().or(z.literal('')),
    challenge_submission: z.string().optional().or(z.literal('')),
    required_expertise_level_id: z.string().optional().or(z.literal('')),
    required_proficiencies: z.array(z.string()).default([]),
    required_sub_domains: z.array(z.string()).default([]),
    required_specialities: z.array(z.string()).default([]),
    eligibility: z.string().max(2000).optional().or(z.literal('')),
    permitted_artifact_types: z.array(z.string()).default([]),
    submission_template_url: z.string().optional().or(z.literal('')),
    targeting_filters: z.object({
      industries: z.array(z.string()).default([]),
      geographies: z.array(z.string()).default([]),
      expertise_domains: z.array(z.string()).default([]),
      certifications: z.array(z.string()).default([]),
      languages: z.array(z.string()).default([]),
      min_solver_rating: z.string().default('any'),
      past_performance: z.string().default('any'),
      solver_cluster: z.string().default('any'),
    }).default({}),

    // Step 6 — Solution Templates
    solution_category_description: z.string().max(2000).optional().or(z.literal('')),
  });
}

/** Default schema (lightweight) — used for type inference */
export const challengeFormSchema = createChallengeFormSchema(true);

export type ChallengeFormValues = z.infer<typeof challengeFormSchema>;

export const DEFAULT_FORM_VALUES: ChallengeFormValues = {
  title: '',
  hook: '',
  description: '',
  problem_statement: '',
  scope: '',
  domain_tags: [],
  taxonomy_tags: '',
  maturity_level: undefined as unknown as 'blueprint',

  // Rich-text fields
  context_background: '',
  detailed_description: '',
  root_causes: '',
  affected_stakeholders: '',
  current_deficiencies: '',
  expected_outcomes: '',
  preferred_approach: '',
  approaches_not_of_interest: '',
  industry_segment_id: '',
  experience_countries: [],

  deliverables_list: [''],
  submission_guidelines: '',

  // Evaluation
  weighted_criteria: [
    { name: 'Technical Approach & Innovation', weight: 30, description: '', rubrics: undefined },
    { name: 'SAP Integration Feasibility', weight: 20, description: '', rubrics: undefined },
    { name: 'Accuracy & Performance', weight: 25, description: '', rubrics: undefined },
    { name: 'Implementation Plan', weight: 15, description: '', rubrics: undefined },
    { name: 'Team Experience', weight: 10, description: '', rubrics: undefined },
  ],

  // Rewards
  reward_type: 'monetary',
  reward_description: '',
  currency_code: 'USD',
  platinum_award: 0,
  gold_award: 0,
  silver_award: undefined,
  num_rewarded_solutions: '3' as const,
  effort_level: '',
  rejection_fee_pct: 10,
  payment_mode: 'escrow' as const,
  payment_milestones: [
    { name: 'Abstract Shortlisted', pct: 10, trigger: 'on_shortlisting' },
    { name: 'Full Solution Submitted', pct: 30, trigger: 'on_full_submission' },
    { name: 'Solution Selected', pct: 60, trigger: 'on_selection' },
  ],
  ip_model: '',

  // Timeline
  submission_deadline: '',
  expected_timeline: '',
  review_duration: undefined,
  phase_notes: '',
  phase_durations: undefined,
  complexity_notes: '',
  complexity_params: undefined,

  // Provider Eligibility
  eligible_participation_modes: [],
  solver_eligibility_id: '',
  solver_eligibility_ids: [],
  challenge_visibility: '',
  challenge_enrollment: '',
  challenge_submission: '',
  required_expertise_level_id: '',
  required_proficiencies: [],
  required_sub_domains: [],
  required_specialities: [],
  eligibility: '',
  permitted_artifact_types: [],
  submission_template_url: '',
  targeting_filters: {
    industries: [],
    geographies: [],
    expertise_domains: [],
    certifications: [],
    languages: [],
    min_solver_rating: 'any',
    past_performance: 'any',
    solver_cluster: 'any',
  },

  // Templates
  solution_category_description: '',
};
