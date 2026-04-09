/**
 * autoDefaults — Sensible defaults for fields marked 'auto' in governance rules.
 * Applied during payload building when the Creator doesn't fill these fields.
 */

import type { FieldRulesMap } from '@/hooks/queries/useGovernanceFieldRules';

/** Default values for auto-populated governance fields */
export const AUTO_DEFAULTS: Record<string, string | number | string[]> = {
  reward_type: 'MONETARY',
  challenge_visibility: 'public',
  challenge_enrollment: 'open',
  challenge_submission: 'open',
  eligibility: 'Open to all qualified solvers',
  num_rewarded_solutions: 3,
  gold_award: 0,
  rejection_fee_pct: 0,
  ip_model: 'IP-NEL',
  maturity_level: 'PROTOTYPE',
  deliverables_list: ['Working prototype or proof of concept'],
};

/**
 * Applies auto-defaults for fields that the governance rules mark as 'auto'
 * but that are empty/null in the payload.
 */
export function applyAutoDefaults<T extends Record<string, unknown>>(
  payload: T,
  rules: FieldRulesMap,
): T {
  const result = { ...payload };

  for (const [fieldKey, defaultValue] of Object.entries(AUTO_DEFAULTS)) {
    const rule = rules[fieldKey];
    if (rule?.visibility !== 'auto') continue;

    // Map governance field_key to payload key (camelCase variants)
    const payloadKeys = getPayloadKeys(fieldKey);
    for (const pk of payloadKeys) {
      if (pk in result) {
        const val = result[pk];
        if (val === null || val === undefined || val === '' ||
            (Array.isArray(val) && val.length === 0)) {
          (result as Record<string, unknown>)[pk] = defaultValue;
        }
      }
    }
  }

  return result;
}

/** Maps a governance field_key to possible payload key variants */
function getPayloadKeys(fieldKey: string): string[] {
  const keys = [fieldKey];
  // Add camelCase variant
  const camel = fieldKey.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
  if (camel !== fieldKey) keys.push(camel);
  return keys;
}
