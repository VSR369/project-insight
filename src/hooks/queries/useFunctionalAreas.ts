import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFunctionalAreas() {
  return useQuery({
    queryKey: ['functional_areas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_functional_areas')
        .select('id, code, name, department_id')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}
