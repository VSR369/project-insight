/**
 * React Query hook for complexity_dimensions table.
 * Fetches solution-type-specific dimension definitions.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { SolutionType } from '@/lib/cogniblend/challengeContextAssembler';

export interface ComplexityDimension {
  id: string;
  solution_type: string;
  dimension_key: string;
  dimension_name: string;
  display_order: number;
  level_1_description: string;
  level_3_description: string;
  level_5_description: string;
  is_active: boolean;
}

export function useComplexityDimensions(solutionType: SolutionType | null) {
  return useQuery({
    queryKey: ['complexity_dimensions', solutionType],
    queryFn: async (): Promise<ComplexityDimension[]> => {
      if (!solutionType) return [];

      const { data, error } = await supabase
        .from('complexity_dimensions')
        .select('id, solution_type, dimension_key, dimension_name, display_order, level_1_description, level_3_description, level_5_description, is_active')
        .eq('solution_type', solutionType)
        .eq('is_active', true)
        .order('display_order');

      if (error) throw new Error(error.message);
      return data ?? [];
    },
    enabled: !!solutionType,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
