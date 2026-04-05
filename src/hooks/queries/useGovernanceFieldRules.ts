/**
 * useGovernanceFieldRules — Fetches supervisor-configured field visibility
 * and validation rules for a given governance mode from md_governance_field_rules.
 *
 * Returns a map keyed by field_key for O(1) lookups in wizard steps.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STABLE } from '@/config/queryCache';
import type { GovernanceMode } from '@/lib/governanceMode';

/* ── Types ─────────────────────────────────────────────── */

export type FieldVisibility = 'required' | 'optional' | 'hidden' | 'auto' | 'ai_drafted';

export interface FieldRule {
  fieldKey: string;
  wizardStep: number;
  visibility: FieldVisibility;
  minLength: number | null;
  maxLength: number | null;
  defaultValue: string | null;
  displayOrder: number;
}

export type FieldRulesMap = Record<string, FieldRule>;

/* ── Hook ──────────────────────────────────────────────── */

export function useGovernanceFieldRules(governanceMode: GovernanceMode | null | undefined) {
  return useQuery({
    queryKey: ['governance-field-rules', governanceMode],
    queryFn: async (): Promise<FieldRulesMap> => {
      const mode = governanceMode ?? 'STRUCTURED';

      const { data, error } = await supabase.rpc('get_governance_field_rules', {
        p_governance_mode: mode,
      });

      if (error) throw new Error(error.message);

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
    },
    enabled: !!governanceMode,
    ...CACHE_STABLE,
  });
}

/* ── Helpers ───────────────────────────────────────────── */

/** Check if a field should be shown (not hidden) */
export function isFieldVisible(rules: FieldRulesMap | undefined | null, fieldKey: string): boolean {
  if (!rules) return true; // Rules not yet loaded — default to visible
  const rule = rules[fieldKey];
  if (!rule) return false; // NOT in field_rules → not a Creator/governance field → hide
  // 'auto' fields are silently assigned — hide from form and detail view
  return rule.visibility !== 'hidden' && rule.visibility !== 'auto';
}

/** Check if a field is required */
export function isFieldRequired(rules: FieldRulesMap | undefined | null, fieldKey: string): boolean {
  if (!rules) return false;
  const rule = rules[fieldKey];
  if (!rule) return false;
  return rule.visibility === 'required';
}

/** Get min length for a text field */
export function getFieldMinLength(rules: FieldRulesMap | undefined | null, fieldKey: string, fallback: number): number {
  if (!rules) return fallback;
  return rules[fieldKey]?.minLength ?? fallback;
}

/** Get max length for a text field */
export function getFieldMaxLength(rules: FieldRulesMap | undefined | null, fieldKey: string, fallback: number): number {
  if (!rules) return fallback;
  return rules[fieldKey]?.maxLength ?? fallback;
}

/** Check if field is auto-populated */
export function isFieldAuto(rules: FieldRulesMap | undefined | null, fieldKey: string): boolean {
  if (!rules) return false;
  const rule = rules[fieldKey];
  return rule?.visibility === 'auto';
}

/** Check if field is AI-drafted */
export function isFieldAIDrafted(rules: FieldRulesMap | undefined | null, fieldKey: string): boolean {
  if (!rules) return false;
  const rule = rules[fieldKey];
  return rule?.visibility === 'ai_drafted';
}
