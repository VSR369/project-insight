/**
 * useTierGovernanceAccess — React Query hook for md_tier_governance_access.
 * Fetches available governance modes + default for a given subscription tier.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { handleQueryError } from '@/lib/errorHandler';
import type { TierGovernanceRow } from '@/lib/governanceMode';

const STALE_TIME = 5 * 60 * 1000; // 5 minutes — reference data

const QUERY_KEY_PREFIX = 'tier-governance-access';

export function useTierGovernanceAccess(tierCode?: string | null) {
  return useQuery<TierGovernanceRow[]>({
    queryKey: [QUERY_KEY_PREFIX, tierCode],
    queryFn: async () => {
      if (!tierCode) return [];

      const { data, error } = await supabase
        .from('md_tier_governance_access')
        .select('governance_mode, is_default')
        .eq('tier_code', tierCode)
        .eq('is_active', true);

      if (error) {
        handleQueryError(error, { operation: 'fetch_tier_governance_access' });
        return [];
      }

      return (data ?? []) as TierGovernanceRow[];
    },
    enabled: !!tierCode,
    staleTime: STALE_TIME,
  });
}

export function useAllTierGovernanceAccess() {
  return useQuery<Array<TierGovernanceRow & { tier_code: string }>>({
    queryKey: [QUERY_KEY_PREFIX, 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('md_tier_governance_access')
        .select('tier_code, governance_mode, is_default')
        .eq('is_active', true)
        .order('tier_code');

      if (error) {
        handleQueryError(error, { operation: 'fetch_all_tier_governance_access' });
        return [];
      }

      return (data ?? []) as Array<TierGovernanceRow & { tier_code: string }>;
    },
    staleTime: STALE_TIME,
  });
}
