/**
 * governanceFieldFilter — Shared utility for governance-aware field filtering.
 *
 * Provides:
 *  - fetchGovernanceFieldRules(): one-shot RPC fetch (for use in mutations)
 *  - stripHiddenFields(): removes hidden fields from any payload
 *  - FORM_FIELD_TO_GOVERNANCE_KEY: mapping from Creator form keys to governance field_keys
 *  - EXTENDED_BRIEF_GOVERNANCE_KEYS: mapping for extended_brief sub-fields
 */

import { supabase } from '@/integrations/supabase/client';
import type { FieldRulesMap, FieldVisibility } from '@/hooks/queries/useGovernanceFieldRules';

/* ── Form field → governance field_key mapping ──────────── */

/**
 * Maps Creator form / payload keys to their governance field_key
 * in md_governance_field_rules. Only fields that CAN be hidden are listed.
 */
export const FORM_FIELD_TO_GOVERNANCE_KEY: Record<string, string> = {
  // Direct challenge columns
  scope: 'scope',
  constraints: 'scope', // payload uses "constraints" for scope
  ip_model: 'ip_model',
  ipModel: 'ip_model',
  submission_guidelines: 'submission_guidelines',
  submissionGuidelines: 'submission_guidelines',
  expected_timeline: 'expected_timeline',
  expectedTimeline: 'expected_timeline',

  // Domain tags
  domain_tags: 'domain_tags',
  domainTags: 'domain_tags',

  // Budget fields (governed by platinum_award field_key)
  budgetMin: 'platinum_award',
  budgetMax: 'platinum_award',
  budget_min: 'platinum_award',
  budget_max: 'platinum_award',
  currency: 'platinum_award',

  // Maturity & expected outcomes
  maturity_level: 'maturity_level',
  maturityLevel: 'maturity_level',
  expected_outcomes: 'expected_outcomes',
  expectedOutcomes: 'expected_outcomes',

  // Extended brief fields
  context_background: 'context_background',
  contextBackground: 'context_background',
  root_causes: 'root_causes',
  rootCauses: 'root_causes',
  affected_stakeholders: 'affected_stakeholders',
  affectedStakeholders: 'affected_stakeholders',
  current_deficiencies: 'current_deficiencies',
  currentDeficiencies: 'current_deficiencies',
  preferred_approach: 'preferred_approach',
  preferredApproach: 'preferred_approach',
  approaches_not_of_interest: 'approaches_not_of_interest',
  approachesNotOfInterest: 'approaches_not_of_interest',
};

/**
 * Extended brief sub-keys that map to governance field_keys.
 * Used to strip hidden fields from the extended_brief JSONB before DB write.
 */
export const EXTENDED_BRIEF_GOVERNANCE_KEYS: Record<string, string> = {
  context_background: 'context_background',
  root_causes: 'root_causes',
  affected_stakeholders: 'affected_stakeholders',
  current_deficiencies: 'current_deficiencies',
  preferred_approach: 'preferred_approach',
  approaches_not_of_interest: 'approaches_not_of_interest',
};

/* ── Fetch (one-shot, not a hook) ──────────────────────── */

export async function fetchGovernanceFieldRules(
  governanceMode: string,
): Promise<FieldRulesMap> {
  const mode = (governanceMode || 'STRUCTURED').toUpperCase().trim();

  const { data, error } = await supabase.rpc('get_governance_field_rules', {
    p_governance_mode: mode,
  });

  if (error) {
    console.warn('[governanceFieldFilter] Failed to fetch rules, defaulting to empty:', error.message);
    return {};
  }

  const rules = (data as any[]) ?? [];
  const map: FieldRulesMap = {};

  for (const r of rules) {
    map[r.field_key] = {
      fieldKey: r.field_key,
      wizardStep: r.wizard_step,
      visibility: r.visibility as FieldVisibility,
      minLength: r.min_length,
      maxLength: r.max_length,
      defaultValue: r.default_value,
      displayOrder: r.display_order,
    };
  }

  return map;
}

/* ── Strip hidden fields from a flat payload ────────────── */

/**
 * Removes keys from `payload` whose governance field_key visibility is 'hidden' or 'auto'.
 * Uses `fieldKeyMap` to translate payload keys → governance field_keys.
 * 'auto' fields are silently assigned defaults — they should not appear in user-facing snapshots.
 */
export function stripHiddenFields<T extends Record<string, unknown>>(
  payload: T,
  rules: FieldRulesMap,
  fieldKeyMap: Record<string, string> = FORM_FIELD_TO_GOVERNANCE_KEY,
): T {
  const result = { ...payload };

  for (const [payloadKey, fieldKey] of Object.entries(fieldKeyMap)) {
    const vis = rules[fieldKey]?.visibility;
    if (payloadKey in result && (vis === 'hidden' || vis === 'auto')) {
      delete result[payloadKey];
    }
  }

  return result;
}

/**
 * Strips hidden fields from an extended_brief object.
 */
export function stripHiddenExtendedBriefFields(
  extendedBrief: Record<string, unknown>,
  rules: FieldRulesMap,
): Record<string, unknown> {
  return stripHiddenFields(extendedBrief, rules, EXTENDED_BRIEF_GOVERNANCE_KEYS);
}

/**
 * Filters seed data for Fill Test Data, removing fields hidden by governance.
 * Preserves always-visible fields (title, problem_statement, domain_tags, etc.).
 */
export function filterSeedByGovernance<T extends Record<string, unknown>>(
  seed: T,
  rules: FieldRulesMap,
): T {
  const result = { ...seed };

  // Only strip fields that are in the governance mapping and hidden
  for (const [seedKey, fieldKey] of Object.entries(FORM_FIELD_TO_GOVERNANCE_KEY)) {
    if (seedKey in result && rules[fieldKey]?.visibility === 'hidden') {
      // Reset to empty default based on type
      const currentVal = result[seedKey];
      if (Array.isArray(currentVal)) {
        (result as any)[seedKey] = [''];
      } else if (typeof currentVal === 'string') {
        (result as any)[seedKey] = '';
      } else {
        delete result[seedKey];
      }
    }
  }

  return result;
}
