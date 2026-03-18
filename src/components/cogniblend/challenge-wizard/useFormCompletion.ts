/**
 * useFormCompletion — Computes per-step and overall field completion
 * for the Challenge Creation wizard.
 *
 * Required fields per step are governance-aware:
 *   LIGHTWEIGHT: fewer required fields
 *   ENTERPRISE: all fields required
 */

import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
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

/** Field definitions per step — governance-aware */
function getRequiredFieldsByStep(isLightweight: boolean): Array<Array<keyof ChallengeFormValues>> {
  return [
    // Step 1 — Problem
    isLightweight
      ? ['title', 'problem_statement', 'domain_tags', 'maturity_level']
      : ['title', 'problem_statement', 'scope', 'domain_tags', 'maturity_level'],

    // Step 2 — Requirements
    isLightweight
      ? ['deliverables_list']
      : ['deliverables_list', 'submission_guidelines', 'ip_model', 'visibility', 'eligibility'],

    // Step 3 — Evaluation
    isLightweight
      ? ['weighted_criteria', 'platinum_award']
      : ['weighted_criteria', 'platinum_award', 'gold_award', 'rejection_fee_pct'],

    // Step 4 — Timeline
    isLightweight
      ? ['expected_timeline']
      : ['submission_deadline', 'expected_timeline', 'review_duration'],
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
  isLightweight: boolean,
): FormCompletion {
  const values = form.watch();

  return useMemo(() => {
    const stepFields = getRequiredFieldsByStep(isLightweight);
    const steps: StepCompletion[] = stepFields.map((fields) => {
      const filled = fields.filter((field) => isFieldFilled(values[field])).length;
      return { filled, total: fields.length };
    });

    const totalFilled = steps.reduce((s, step) => s + step.filled, 0);
    const totalRequired = steps.reduce((s, step) => s + step.total, 0);

    return { steps, totalFilled, totalRequired };
  }, [values, isLightweight]);
}
