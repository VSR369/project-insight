/**
 * React Query hook for master_complexity_params table.
 * Used by the Challenge Wizard (Step 4) to fetch admin-managed complexity parameters.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ComplexityParam {
  id: string;
  param_key: string;
  name: string;
  weight: number;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

export function useComplexityParams() {
  return useQuery({
    queryKey: ['master_complexity_params'],
    queryFn: async (): Promise<ComplexityParam[]> => {
      const { data, error } = await supabase
        .from('master_complexity_params')
        .select('id, param_key, name, weight, description, display_order, is_active')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw new Error(error.message);
      return (data ?? []).map((row: any) => ({
        ...row,
        weight: Number(row.weight),
      }));
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
