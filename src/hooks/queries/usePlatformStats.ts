/**
 * Platform Stats Hook
 * 
 * React Query hook for public platform_stats_cache.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const STATS_QUERY_KEY = 'platform-stats';

export interface PlatformStat {
  stat_key: string;
  stat_value: number;
  stat_label: string | null;
  display_order: number | null;
  computed_at: string;
}

/**
 * Fetch all cached platform stats (public, no auth required)
 */
export function usePlatformStats() {
  return useQuery({
    queryKey: [STATS_QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_stats_cache')
        .select('stat_key, stat_value, stat_label, display_order, computed_at')
        .order('display_order', { ascending: true });
      if (error) throw new Error(error.message);
      return (data ?? []) as PlatformStat[];
    },
    staleTime: 15 * 60_000, // 15 min — stats cached
  });
}

/**
 * Get a specific stat by key from the cached list.
 */
export function getStatByKey(stats: PlatformStat[], key: string): number {
  return stats.find((s) => s.stat_key === key)?.stat_value ?? 0;
}
