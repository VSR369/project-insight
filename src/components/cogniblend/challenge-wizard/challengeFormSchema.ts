/**
 * Zod schema for the Challenge Creation wizard form.
 * Covers all 7 steps. Validation rules are driven by DB-configured governance field rules.
 *
 * The schema builder accepts either:
 *   1. A FieldRulesMap from useGovernanceFieldRules (preferred, DB-driven)
 *   2. A GovernanceMode string (fallback with hardcoded defaults)
 *   3. A legacy boolean (backward compat)
 */

import { z } from 'zod';
import type { GovernanceMode } from '@/lib/governanceMode';
import type { FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

/* ── Fallback min lengths (used when no DB rules available) ── */
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

/* ── Helpers to resolve min/max from rules or fallback ── */

function resolveMinLength(
  fieldRules: FieldRulesMap | null,
  fieldKey: string,
  mode: GovernanceMode,
  fallbacks: Record<GovernanceMode, number>,
): number {
  if (fieldRules?.[fieldKey]?.minLength != null) {
    return fieldRules[fieldKey].minLength!;
  }
  return fallbacks[mode];
}

function resolveMaxLength(
  fieldRules: FieldRulesMap | null,
  fieldKey: string,
  fallback: number,
): number {
  if (fieldRules?.[fieldKey]?.maxLength != null) {
    return fieldRules[fieldKey].maxLength!;
  }
  return fallback;
}

function isRequired(fieldRules: FieldRulesMap | null, fieldKey: string): boolean {
  if (!fieldRules) return false;
  return fieldRules[fieldKey]?.visibility === 'required';
}

function isHidden(fieldRules: FieldRulesMap | null, fieldKey: string): boolean {
  if (!fieldRules) return false;
  return fieldRules[fieldKey]?.visibility === 'hidden';
}

/**
 * Creates a governance-aware challenge form schema.
 * Accepts:
 *   - FieldRulesMap (DB-driven, preferred)
 *   - GovernanceMode string
 *   - boolean (legacy isQuick)
 */
export function createChallengeFormSchema(
  modeOrLightweightOrRules: GovernanceMode | boolean | FieldRulesMap,
  fieldRulesFromDb?: FieldRulesMap,
) {
  let mode: GovernanceMode;
  let fieldRules: FieldRulesMap | null = null;

  if (typeof modeOrLightweightOrRules === 'boolean') {
    mode = modeOrLightweightOrRules ? 'QUICK' : 'STRUCTURED';
    fieldRules = fieldRulesFromDb ?? null;
  } else if (typeof modeOrLightweightOrRules === 'string') {
    mode = modeOrLightweightOrRules;
    fieldRules = fieldRulesFromDb ?? null;
  } else {
    // FieldRulesMap passed directly — infer mode from rules content
    fieldRules = modeOrLightweightOrRules;
    mode = 'STRUCTURED'; // default, but rules override everything
  }

  const problemMin = resolveMinLength(fieldRules, 'problem_statement', mode, {
    QUICK: PROBLEM_MIN_QUICK,
    STRUCTURED: PROBLEM_MIN_STRUCTURED,
    CONTROLLED: PROBLEM_MIN_CONTROLLED,
  });

  const problemMax = resolveMaxLength(fieldRules, 'problem_statement', 5000);

  const scopeMin = resolveMinLength(fieldRules, 'scope', mode, {
    QUICK: SCOPE_MIN_QUICK,
    STRUCTURED: SCOPE_MIN_STRUCTURED,
    CONTROLLED: SCOPE_MIN_CONTROLLED,
  });

  const scopeMax = resolveMaxLength(fieldRules, 'scope', 3000);
  const titleMax = resolveMaxLength(fieldRules, 'title', TITLE_MAX);

  // Governance mode flags
  const isQuick = mode === 'QUICK';
  const isControlled = mode === 'CONTROLLED';

  // Scope: required in STRUCTURED/CONTROLLED, optional in QUICK (unless DB overrides)
  const scopeIsOptional = fieldRules
    ? !isRequired(fieldRules, 'scope')
    : isQuick;

  return z.object({
    // Step 0 — Mode & Model Selection
    governance_mode: z.enum(['QUICK', 'STRUCTURED', 'CONTROLLED']).default('STRUCTURED'),
    operating_model: z.enum(['MP', 'AGG']).default('MP'),
    creator_approval_required: z.boolean().default(mode !== 'QUICK'),

    // Step 1 — Challenge Brief
    title: z.string().min(1, 'Title is required').max(titleMax, `Title cannot exceed ${titleMax} characters`).trim(),
    hook: z.string().max(resolveMaxLength(fieldRules, 'hook', 300)).optional().or(z.literal('')),
    description: z.string().max(resolveMaxLength(fieldRules, 'description', 2000)).optional().or(z.literal('')),
    problem_statement: z.string()
      .min(problemMin, `Problem statement must be at least ${problemMin} characters`)
      .max(problemMax, `Max ${problemMax} characters`)
      .trim(),
    scope: scopeIsOptional
      ? z.string().max(scopeMax).optional().or(z.literal(''))
      : z.string()
          .min(scopeMin, `Scope must be at least ${scopeMin} characters`)
          .max(scopeMax, `Max ${scopeMax} characters`)
          .trim(),
    domain_tags: z.array(z.string()).min(1, 'At least one domain tag is required'),
    taxonomy_tags: z.string().max(500).optional().or(z.literal('')),
    maturity_level: z.string().min(1, 'Please select a maturity level'),
    solution_maturity_id: z.string().optional().or(z.literal('')),

    // Step 1 — Rich-text fields (always optional per plan v2)
    context_background: z.string().max(5000).optional().or(z.literal('')),
    detailed_description: z.string().max(5000).optional().or(z.literal('')),

    // Step 1 — Line items (aligned with curator line_items format)
    // root_causes / current_deficiencies: required for CONTROLLED, optional otherwise
    root_causes: isControlled
      ? z.array(z.string()).refine((arr) => arr.some((s) => s.trim().length > 0), 'At least one root cause is required for Controlled mode')
      : z.array(z.string()).default(['']),
    current_deficiencies: isControlled
      ? z.array(z.string()).refine((arr) => arr.some((s) => s.trim().length > 0), 'At least one deficiency is required for Controlled mode')
      : z.array(z.string()).default(['']),
    expected_outcomes: z.array(z.string()).default(['']),
    // preferred_approach / approaches_not_of_interest: always optional
    preferred_approach: z.array(z.string()).default(['']),
    approaches_not_of_interest: z.array(z.string()).default(['']),

    // Step 1 — Structured table (CONTROLLED: required; else optional)
    affected_stakeholders: isControlled
      ? z.array(z.object({
          stakeholder_name: z.string().max(200).default(''),
          role: z.string().max(200).default(''),
          impact_description: z.string().max(500).default(''),
          adoption_challenge: z.string().max(500).default(''),
        })).refine((arr) => arr.some((s) => s.stakeholder_name.trim().length > 0), 'At least one stakeholder is required for Controlled mode')
      : z.array(z.object({
          stakeholder_name: z.string().max(200).default(''),
          role: z.string().max(200).default(''),
          impact_description: z.string().max(500).default(''),
          adoption_challenge: z.string().max(500).default(''),
        })).default([]),

    // Step 1 — Selectors
    // industry_segment_id: optional for QUICK, required for STRUCTURED/CONTROLLED
    industry_segment_id: isQuick
      ? z.string().optional().or(z.literal(''))
      : z.string().min(1, 'Please select an industry segment'),
    experience_countries: z.array(z.string()).default([]),

    // Step 1 — Deliverables
    deliverables_list: z.array(z.string()).default(['']),
    submission_guidelines: z.array(z.string()).default(['']),

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
  governance_mode: 'STRUCTURED' as const,
  operating_model: 'MP' as const,
  creator_approval_required: true,
  title: '',
  hook: '',
  description: '',
  problem_statement: '',
  scope: '',
  domain_tags: [],
  taxonomy_tags: '',
  maturity_level: '',
  solution_maturity_id: '',

  // Rich-text fields
  context_background: '',
  detailed_description: '',

  // Line items (curator-aligned)
  root_causes: [''],
  current_deficiencies: [''],
  expected_outcomes: [''],
  preferred_approach: [''],
  approaches_not_of_interest: [''],

  // Structured table (curator-aligned)
  affected_stakeholders: [],

  industry_segment_id: '',
  experience_countries: [],

  deliverables_list: [''],
  submission_guidelines: [''],

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
