/**
 * useFormCompletion — Computes per-step and overall field completion
 * for the Challenge Creation wizard.
 *
 * Required fields per step are governance-aware (3-mode system):
 *   QUICK: fewer required fields
 *   STRUCTURED: standard fields
 *   CONTROLLED: all fields required (strictest)
 */

import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { GovernanceMode } from '@/lib/governanceMode';
import type { ChallengeFormValues } from './challengeFormSchema';

interface StepCompletion {
  filled: number;
  total: number;
}

export interface FormCompletion {
  steps: StepCompletion[];
  totalFilled: number;
  totalRequired: number;
}

/** Field definitions per step — 3-mode governance-aware */
function getRequiredFieldsByStep(mode: GovernanceMode): Array<Array<keyof ChallengeFormValues>> {
  if (mode === 'QUICK') {
    return [
      // Step 0 — Mode
      ['governance_mode'],
      // Step 1 — Problem
      ['title', 'problem_statement', 'domain_tags', 'maturity_level'],
      // Step 2 — Evaluation
      ['weighted_criteria'],
      // Step 3 — Rewards
      ['platinum_award'],
      // Step 4 — Timeline
      ['expected_timeline'],
      // Step 5 — Eligibility
      ['eligibility'],
      // Step 6 — Templates
      [],
      // Step 7 — Review
      [],
    ];
  }

  if (mode === 'CONTROLLED') {
    return [
      // Step 0 — Mode
      ['governance_mode'],
      // Step 1 — Problem
      ['title', 'problem_statement', 'scope', 'domain_tags', 'maturity_level'],
      // Step 2 — Evaluation
      ['weighted_criteria'],
      // Step 3 — Rewards
      ['platinum_award', 'gold_award', 'rejection_fee_pct', 'ip_model'],
      // Step 4 — Timeline
      ['expected_timeline', 'review_duration'],
      // Step 5 — Eligibility
      ['eligibility'],
      // Step 6 — Templates
      [],
      // Step 7 — Review
      [],
    ];
  }

  // STRUCTURED (default)
  return [
    // Step 0 — Mode
    ['governance_mode'],
    // Step 1 — Problem
    ['title', 'problem_statement', 'scope', 'domain_tags', 'maturity_level'],
    // Step 2 — Evaluation
    ['weighted_criteria'],
    // Step 3 — Rewards
    ['platinum_award', 'gold_award', 'rejection_fee_pct'],
    // Step 4 — Timeline
    ['expected_timeline', 'review_duration'],
    // Step 5 — Eligibility
    ['eligibility'],
    // Step 6 — Templates
    [],
    // Step 7 — Review
    [],
  ];
}

function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) {
    // For arrays like domain_tags, deliverables_list, weighted_criteria
    if (value.length === 0) return false;
    // deliverables_list: check if at least one non-empty string
    if (typeof value[0] === 'string') return value.some((v) => typeof v === 'string' && v.trim().length > 0);
    // weighted_criteria: check if at least one has a name
    if (typeof value[0] === 'object' && value[0] !== null && 'name' in value[0]) {
      return value.some((v: any) => v.name?.trim().length > 0);
    }
    return true;
  }
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return false;
}

export function useFormCompletion(
  form: UseFormReturn<ChallengeFormValues>,
  governanceMode: GovernanceMode,
): FormCompletion {
  const values = form.watch();

  return useMemo(() => {
    const stepFields = getRequiredFieldsByStep(governanceMode);
    const steps: StepCompletion[] = stepFields.map((fields) => {
      const filled = fields.filter((field) => isFieldFilled(values[field])).length;
      return { filled, total: fields.length };
    });

    const totalFilled = steps.reduce((s, step) => s + step.filled, 0);
    const totalRequired = steps.reduce((s, step) => s + step.total, 0);

    return { steps, totalFilled, totalRequired };
  }, [values, governanceMode]);
}
