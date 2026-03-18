/**
 * Zod schema for the Challenge Creation wizard form.
 * Covers all 7 steps. Validation severity depends on governance_profile.
 */

import { z } from 'zod';

/* ── Governance-aware min lengths ──────────────────────── */
export const PROBLEM_MIN_ENTERPRISE = 500;
export const PROBLEM_MIN_LIGHTWEIGHT = 200;
export const SCOPE_MIN_ENTERPRISE = 200;
export const SCOPE_MIN_LIGHTWEIGHT = 100;
export const TITLE_MAX = 200;

/**
 * Creates a governance-aware challenge form schema.
 * Enterprise has stricter minimum lengths for problem_statement and scope.
 */
export function createChallengeFormSchema(isLightweight: boolean) {
  const problemMin = isLightweight ? PROBLEM_MIN_LIGHTWEIGHT : PROBLEM_MIN_ENTERPRISE;
  const scopeMin = isLightweight ? SCOPE_MIN_LIGHTWEIGHT : SCOPE_MIN_ENTERPRISE;

  return z.object({
    // Step 1 — Challenge Brief
    title: z.string().min(1, 'Title is required').max(TITLE_MAX, `Title cannot exceed ${TITLE_MAX} characters`).trim(),
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
    maturity_level: z.enum(['blueprint', 'poc', 'prototype', 'pilot'], {
      errorMap: () => ({ message: 'Please select a maturity level' }),
    }),

    // Step 1 — New rich-text fields
    context_background: z.string().max(5000).optional().or(z.literal('')),
    detailed_description: z.string().max(5000).optional().or(z.literal('')),
    root_causes: z.string().max(5000).optional().or(z.literal('')),
    affected_stakeholders: z.string().max(5000).optional().or(z.literal('')),
    current_deficiencies: z.string().max(5000).optional().or(z.literal('')),
    expected_outcomes: z.string().max(5000).optional().or(z.literal('')),
    preferred_approach: z.string().max(5000).optional().or(z.literal('')),
    approaches_not_of_interest: z.string().max(5000).optional().or(z.literal('')),

    // Step 1 — New selectors
    industry_segment_id: z.string().optional().or(z.literal('')),
    experience_countries: z.array(z.string()).default([]),

    // Step 2 — Requirements (now includes deliverables moved from old step 2)
    deliverables_list: z.array(z.string()).default(['']),
    description: z.string().max(2000).optional().or(z.literal('')),
    ip_model: z.string().optional().or(z.literal('')),
    visibility: z.string().optional().or(z.literal('')),
    eligibility: z.string().max(2000).optional().or(z.literal('')),
    complexity_notes: z.string().max(2000).optional().or(z.literal('')),
    permitted_artifact_types: z.array(z.string()).default([]),
    submission_guidelines: z.string().max(3000).optional().or(z.literal('')),
    submission_template_url: z.string().optional().or(z.literal('')),
    // Step 5 — Provider Category (multi-select from participation_modes; empty = All)
    eligible_participation_modes: z.array(z.string()).default([]),
    // Step 5 — Solver tier (database-driven single selection; empty = All)
    solver_eligibility_id: z.string().optional().or(z.literal('')),
    // Step 5 — Solver tier multi-select (checkboxes)
    solver_eligibility_ids: z.array(z.string()).default([]),
    // Step 5 — Provider eligibility criteria
    required_expertise_level_id: z.string().optional().or(z.literal('')),
    required_proficiencies: z.array(z.string()).default([]),
    required_sub_domains: z.array(z.string()).default([]),
    required_specialities: z.array(z.string()).default([]),

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
    currency_code: z.string().default('USD'),
    platinum_award: z.number().min(0).default(0),
    gold_award: z.number().min(0).default(0),
    silver_award: z.number().min(0).optional(),
    rejection_fee_pct: z.number().min(5).max(20).default(10),
    taxonomy_tags: z.string().max(500).optional().or(z.literal('')),
    reward_type: z.enum(['monetary', 'non_monetary']).default('monetary'),
    reward_description: z.string().max(2000).optional().or(z.literal('')),

    // Step 3 — Reward extras
    num_rewarded_solutions: z.enum(['1', '2', '3']).default('3'),
    payment_mode: z.enum(['escrow', 'direct']).default('escrow'),
    payment_milestones: z.array(z.object({
      name: z.string().min(1, 'Milestone name is required').max(200),
      pct: z.number().min(0).max(100),
      trigger: z.string().max(200).optional().or(z.literal('')),
    })).default([]),

    // Step 4 — Timeline
    submission_deadline: z.string().optional().or(z.literal('')),
    expected_timeline: z.string().max(200).optional().or(z.literal('')),
    review_duration: z.number().int().min(1).max(90).optional(),
    phase_notes: z.string().max(2000).optional().or(z.literal('')),
    phase_durations: z.record(z.string(), z.number().min(1).max(365)).optional(),
    complexity_params: z.record(z.string(), z.number().min(0).max(10)).optional(),

    // Step 5 — Enterprise 3-tier publication config
    challenge_visibility: z.string().optional().or(z.literal('')),
    challenge_enrollment: z.string().optional().or(z.literal('')),
    challenge_submission: z.string().optional().or(z.literal('')),

    // Step 5 — Targeting filters (JSONB)
    // Step 6 — Solution category
    solution_category_description: z.string().max(2000).optional().or(z.literal('')),

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
  });
}

/** Default schema (lightweight) — used for type inference */
export const challengeFormSchema = createChallengeFormSchema(true);

export type ChallengeFormValues = z.infer<typeof challengeFormSchema>;

export const DEFAULT_FORM_VALUES: ChallengeFormValues = {
  title: '',
  problem_statement: '',
  scope: '',
  domain_tags: [],
  maturity_level: undefined as unknown as 'blueprint',

  // New Step 1 fields
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
  description: '',
  ip_model: '',
  visibility: '',
  eligibility: '',
  complexity_notes: '',
  weighted_criteria: [
    { name: 'Technical Approach & Innovation', weight: 30, description: '', rubrics: undefined },
    { name: 'SAP Integration Feasibility', weight: 20, description: '', rubrics: undefined },
    { name: 'Accuracy & Performance', weight: 25, description: '', rubrics: undefined },
    { name: 'Implementation Plan', weight: 15, description: '', rubrics: undefined },
    { name: 'Team Experience', weight: 10, description: '', rubrics: undefined },
  ],
  currency_code: 'USD',
  platinum_award: 0,
  gold_award: 0,
  silver_award: undefined,
  rejection_fee_pct: 10,
  reward_type: 'monetary',
  reward_description: '',
  permitted_artifact_types: [],
  submission_guidelines: '',
  submission_template_url: '',
  eligible_participation_modes: [],
  solver_eligibility_id: '',
  required_expertise_level_id: '',
  required_proficiencies: [],
  required_sub_domains: [],
  required_specialities: [],
  taxonomy_tags: '',
  num_rewarded_solutions: '3' as const,
  payment_mode: 'escrow' as const,
  payment_milestones: [
    { name: 'Abstract Shortlisted', pct: 10, trigger: 'on_shortlisting' },
    { name: 'Full Solution Submitted', pct: 30, trigger: 'on_full_submission' },
    { name: 'Solution Selected', pct: 60, trigger: 'on_selection' },
  ],
  submission_deadline: '',
  expected_timeline: '',
  review_duration: undefined,
  phase_notes: '',
  phase_durations: undefined,
  complexity_params: undefined,
  challenge_visibility: '',
  challenge_enrollment: '',
  challenge_submission: '',
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
};
