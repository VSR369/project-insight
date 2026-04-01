/**
 * useFormCompletion — Computes per-step and overall field completion
 * for the Challenge Creation wizard.
 *
 * Dynamically derives required fields from the FieldRulesMap (fetched from
 * md_governance_field_rules) instead of hardcoding per-mode arrays.
 * This eliminates drift between DB governance rules and UI completion tracking.
 */

import { useMemo } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';
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

/** Total number of wizard steps (0-indexed: Mode, Problem, Evaluation, Rewards, Timeline, Eligibility, Templates, Review) */
const WIZARD_STEP_COUNT = 8;

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

/**
 * Derives required fields per wizard step from the FieldRulesMap.
 * Groups fields by their wizard_step and filters for visibility === 'required'.
 */
function getRequiredFieldsByStepFromRules(
  fieldRules: FieldRulesMap | undefined | null,
): Array<Array<keyof ChallengeFormValues>> {
  if (!fieldRules) {
    // Fallback: return empty arrays — completion will show 0/0 until rules load
    return Array.from({ length: WIZARD_STEP_COUNT }, () => []);
  }

  // Group required fields by wizard_step
  const stepMap = new Map<number, Array<keyof ChallengeFormValues>>();

  for (const [fieldKey, rule] of Object.entries(fieldRules)) {
    if (rule.visibility === 'required' && rule.wizardStep >= 0 && rule.wizardStep < WIZARD_STEP_COUNT) {
      if (!stepMap.has(rule.wizardStep)) {
        stepMap.set(rule.wizardStep, []);
      }
      stepMap.get(rule.wizardStep)!.push(fieldKey as keyof ChallengeFormValues);
    }
  }

  // Build ordered array
  return Array.from({ length: WIZARD_STEP_COUNT }, (_, i) => stepMap.get(i) ?? []);
}

export function useFormCompletion(
  form: UseFormReturn<ChallengeFormValues>,
  fieldRules: FieldRulesMap | undefined | null,
): FormCompletion {
  const values = form.watch();

  return useMemo(() => {
    const stepFields = getRequiredFieldsByStepFromRules(fieldRules);
    const steps: StepCompletion[] = stepFields.map((fields) => {
      const filled = fields.filter((field) => isFieldFilled(values[field])).length;
      return { filled, total: fields.length };
    });

    const totalFilled = steps.reduce((s, step) => s + step.filled, 0);
    const totalRequired = steps.reduce((s, step) => s + step.total, 0);

    return { steps, totalFilled, totalRequired };
  }, [values, fieldRules]);
}
