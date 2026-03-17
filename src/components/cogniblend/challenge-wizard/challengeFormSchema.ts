/**
 * Zod schema for the Challenge Creation wizard form.
 * Covers all 4 steps. Validation severity depends on governance_profile.
 */

import { z } from 'zod';

export const challengeFormSchema = z.object({
  // Step 1 — Problem
  title: z.string().min(1, 'Title is required').max(100, 'Title cannot exceed 100 characters').trim(),
  problem_statement: z.string().min(200, 'Problem statement must be at least 200 characters').max(5000, 'Max 5000 characters').trim(),
  scope: z.string().max(3000).optional().or(z.literal('')),
  domain_tags: z.array(z.string()).min(1, 'At least one domain tag is required'),
  maturity_level: z.enum(['blueprint', 'poc', 'prototype', 'pilot'], {
    errorMap: () => ({ message: 'Please select a maturity level' }),
  }),

  // Step 2 — Requirements
  deliverables_list: z.array(z.string()).default(['']),
  description: z.string().max(2000).optional().or(z.literal('')),
  ip_model: z.string().optional().or(z.literal('')),
  visibility: z.string().default('public'),
  eligibility: z.string().max(2000).optional().or(z.literal('')),
  complexity_notes: z.string().max(2000).optional().or(z.literal('')),
  permitted_artifact_types: z.array(z.string()).default([]),
  submission_guidelines: z.string().max(3000).optional().or(z.literal('')),

  // Step 3 — Evaluation
  weighted_criteria: z.array(z.object({
    name: z.string().min(1, 'Criterion name is required').max(200),
    weight: z.number().min(0).max(100),
  })).min(1, 'At least one criterion is required'),
  currency_code: z.string().default('USD'),
  platinum_award: z.number().min(0).default(0),
  gold_award: z.number().min(0).default(0),
  silver_award: z.number().min(0).optional(),
  rejection_fee_pct: z.number().min(5).max(20).default(10),
  taxonomy_tags: z.string().max(500).optional().or(z.literal('')),

  // Step 4 — Timeline
  submission_deadline: z.string().optional().or(z.literal('')),
  expected_timeline: z.string().max(200).optional().or(z.literal('')),
  review_duration: z.number().int().min(1).max(90).optional(),
  phase_notes: z.string().max(2000).optional().or(z.literal('')),
});

export type ChallengeFormValues = z.infer<typeof challengeFormSchema>;

export const DEFAULT_FORM_VALUES: ChallengeFormValues = {
  title: '',
  problem_statement: '',
  scope: '',
  domain_tags: [],
  maturity_level: undefined as unknown as 'blueprint',
  deliverables_list: [''],
  description: '',
  ip_model: '',
  visibility: 'public',
  eligibility: '',
  complexity_notes: '',
  criteria_list: [''],
  currency_code: 'USD',
  budget_min: 0,
  budget_max: 0,
  max_solutions: 1,
  permitted_artifact_types: [],
  submission_guidelines: '',
  taxonomy_tags: '',
  submission_deadline: '',
  expected_timeline: '',
  review_duration: undefined,
  phase_notes: '',
};
