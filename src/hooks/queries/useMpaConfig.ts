/**
 * React Query hook for md_mpa_config module configuration.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useMpaConfig() {
  return useQuery({
    queryKey: ['mpa-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_mpa_config')
        .select('id, param_key, param_value, description')
        .order('param_key');
      if (error) throw new Error(error.message);
      return data;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

/** Helper to get a specific config value */
export function useMpaConfigValue(key: string) {
  const { data: config, ...rest } = useMpaConfig();
  const value = config?.find((c) => c.param_key === key)?.param_value ?? null;
  return { data: value, ...rest };
}
