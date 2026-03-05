/**
 * useSystemConfig — fetches configurable system parameters from md_system_config.
 * Per Project Knowledge: React Query for all server data, staleTime for reference data.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface SystemConfigEntry {
  config_key: string;
  config_value: string;
  data_type: string;
}

export function useSystemConfig() {
  return useQuery({
    queryKey: ['system-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_system_config')
        .select('config_key, config_value, data_type')
        .eq('is_active', true);
      if (error) throw new Error(error.message);
      return data as SystemConfigEntry[];
    },
    staleTime: 15 * 60 * 1000, // Static config — 15 min
    gcTime: 60 * 60 * 1000,
  });
}

/** Helper to get a typed config value from the query result. */
export function getConfigValue(
  config: SystemConfigEntry[] | undefined,
  key: string,
  fallback: number,
): number {
  if (!config) return fallback;
  const entry = config.find((c) => c.config_key === key);
  if (!entry) return fallback;
  return parseInt(entry.config_value, 10) || fallback;
}
