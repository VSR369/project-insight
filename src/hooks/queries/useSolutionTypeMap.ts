/**
 * React Query hook for proficiency_area_solution_type_map table.
 * Maps Proficiency Area names to solution_type codes.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SolutionTypeMapping {
  id: string;
  proficiency_area_name: string;
  solution_type_code: string;
  description: string | null;
  display_order: number;
}

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

/** Client-side fallback mapping (used when DB is not yet loaded) */
export const PROFICIENCY_AREA_TO_SOLUTION_TYPE: Record<string, string> = {
  'Future & Business Blueprint': 'strategy_design',
  'Business & Operational Excellence': 'process_operations',
  'Digital & Technology Blueprint': 'technology_architecture',
  'Product & Service Innovation': 'product_innovation',
};

/** Reverse lookup: solution_type_code → proficiency area name */
export const SOLUTION_TYPE_TO_PROFICIENCY_AREA: Record<string, string> = Object.fromEntries(
  Object.entries(PROFICIENCY_AREA_TO_SOLUTION_TYPE).map(([k, v]) => [v, k])
);
