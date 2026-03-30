/**
 * React Query hook for md_solution_types table.
 * Fetches 15 granular solution types grouped by proficiency area.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SolutionTypeOption {
  id: string;
  code: string;
  label: string;
  proficiency_group: string;
  proficiency_group_label: string;
  description: string | null;
  display_order: number;
}

export interface SolutionTypeGroup {
  groupCode: string;
  groupLabel: string;
  types: SolutionTypeOption[];
}

export function useSolutionTypes() {
  return useQuery({
    queryKey: ['md-solution-types'],
    queryFn: async (): Promise<SolutionTypeOption[]> => {
      const { data, error } = await supabase
        .from('md_solution_types' as any)
        .select('id, code, label, proficiency_group, proficiency_group_label, description, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SolutionTypeOption[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** Group flat list into proficiency area groups */
export function groupSolutionTypes(types: SolutionTypeOption[]): SolutionTypeGroup[] {
  const groupMap = new Map<string, SolutionTypeGroup>();
  for (const t of types) {
    if (!groupMap.has(t.proficiency_group)) {
      groupMap.set(t.proficiency_group, {
        groupCode: t.proficiency_group,
        groupLabel: t.proficiency_group_label,
        types: [],
      });
    }
    groupMap.get(t.proficiency_group)!.types.push(t);
  }
  return Array.from(groupMap.values());
}

/** Derive the primary proficiency group from selected solution type codes */
export function derivePrimaryGroup(selectedCodes: string[], allTypes: SolutionTypeOption[]): string | null {
  if (selectedCodes.length === 0) return null;
  // Count selections per group, return the one with most selections
  const groupCounts = new Map<string, number>();
  for (const code of selectedCodes) {
    const t = allTypes.find(st => st.code === code);
    if (t) {
      groupCounts.set(t.proficiency_group, (groupCounts.get(t.proficiency_group) ?? 0) + 1);
    }
  }
  let maxGroup: string | null = null;
  let maxCount = 0;
  for (const [group, count] of groupCounts) {
    if (count > maxCount) {
      maxCount = count;
      maxGroup = group;
    }
  }
  return maxGroup;
}

/** Get unique proficiency groups from selected codes */
export function getSelectedGroups(selectedCodes: string[], allTypes: SolutionTypeOption[]): string[] {
  const groups = new Set<string>();
  for (const code of selectedCodes) {
    const t = allTypes.find(st => st.code === code);
    if (t) groups.add(t.proficiency_group);
  }
  return Array.from(groups);
}

// ── Legacy compatibility exports ──

export interface SolutionTypeMapping {
  id: string;
  proficiency_area_name: string;
  solution_type_code: string;
  description: string | null;
  display_order: number;
}

/** @deprecated Use useSolutionTypes instead */
export function useSolutionTypeMap() {
  return useQuery({
    queryKey: ['solution-type-map'],
    queryFn: async (): Promise<SolutionTypeMapping[]> => {
      const { data, error } = await supabase
        .from('proficiency_area_solution_type_map' as any)
        .select('id, proficiency_area_name, solution_type_code, description, display_order')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SolutionTypeMapping[];
    },
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

/** Client-side fallback mapping */
export const PROFICIENCY_AREA_TO_SOLUTION_TYPE: Record<string, string> = {
  'Future & Business Blueprint': 'strategy_design',
  'Business & Operational Excellence': 'process_operations',
  'Digital & Technology Blueprint': 'technology_architecture',
  'Product & Service Innovation': 'product_innovation',
};

export const SOLUTION_TYPE_TO_PROFICIENCY_AREA: Record<string, string> = Object.fromEntries(
  Object.entries(PROFICIENCY_AREA_TO_SOLUTION_TYPE).map(([k, v]) => [v, k])
);
