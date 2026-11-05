/**
 * React Query hooks for md_mpa_config module configuration (MOD-07).
 * Upgraded to return full schema with metadata columns.
 */

import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_STABLE } from '@/config/queryCache';
import { handleQueryError } from '@/lib/errorHandler';
import {
  CONFIG_NUMBER_KEYS, ConfigUnavailableError, parseConfigNumbers,
  type ConfigNumberKey, type ConfigNumbers,
} from '@/services/config/configNumber';

export interface MpaConfigEntry {
  id: string;
  param_key: string;
  param_value: string | null;
  description: string | null;
  param_type: string;
  param_group: string;
  label: string;
  unit: string | null;
  min_value: string | null;
  max_value: string | null;
  is_critical: boolean;
  requires_restart: boolean;
  is_sensitive: boolean;
  updated_at: string | null;
  updated_by_id: string | null;
}

export function useMpaConfig() {
  return useQuery({
    queryKey: ['mpa-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_mpa_config')
        .select('id, param_key, param_value, description, param_type, param_group, label, unit, min_value, max_value, is_critical, requires_restart, is_sensitive, updated_at, updated_by_id')
        .order('param_group')
        .order('param_key');
      if (error) throw new Error(error.message);
      return data as MpaConfigEntry[];
    },
    ...CACHE_STABLE,
  });
}

/** Helper to get a specific config value */
export function useMpaConfigValue(key: string) {
  const { data: config, ...rest } = useMpaConfig();
  const value = config?.find((c) => c.param_key === key)?.param_value ?? null;
  return { data: value, ...rest };
}

/**
 * All numeric business-rule settings, read from the server only. Suspends while
 * loading; if the register cannot be read (or a setting is missing) the error
 * reaches the nearest error boundary, which shows an error with Retry.
 */
export function useConfigNumbers(): ConfigNumbers {
  const { data } = useSuspenseQuery({
    queryKey: ['mpa-config', 'business-numbers'],
    queryFn: async (): Promise<ConfigNumbers> => {
      const { data: rows, error } = await supabase
        .from('md_mpa_config')
        .select('param_key, param_value')
        .in('param_key', [...CONFIG_NUMBER_KEYS]);
      if (error) {
        handleQueryError(error, { operation: 'fetch_business_rule_numbers' });
        throw new ConfigUnavailableError([...CONFIG_NUMBER_KEYS]);
      }
      return parseConfigNumbers(rows ?? []);
    },
    ...CACHE_STABLE,
  });
  return data;
}

/** One numeric business-rule setting (server value; no client fallback). */
export function useConfigNumber(key: ConfigNumberKey): number {
  return useConfigNumbers()[key];
}

/** Helper to get config entries by group */
export function useMpaConfigGroup(group: string) {
  const { data: config, ...rest } = useMpaConfig();
  const entries = config?.filter((c) => c.param_group === group) ?? [];
  return { data: entries, ...rest };
}
