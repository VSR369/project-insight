/**
 * useTierLimitCheck — Calls check_tier_limit RPC to determine
 * if the org can create a new challenge. Used as GATE-01.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentOrg } from '@/hooks/queries/useCurrentOrg';

export interface TierLimitResult {
  allowed: boolean;
  tier_name: string;
  max_allowed: number;
  current_active: number;
}

export function useTierLimitCheck() {
  const { data: currentOrg } = useCurrentOrg();
  const orgId = currentOrg?.organizationId;

  return useQuery({
    queryKey: ['tier_limit_check', orgId],
    queryFn: async (): Promise<TierLimitResult> => {
      if (!orgId) throw new Error('No org');

      const { data, error } = await supabase.rpc('check_tier_limit', {
        p_org_id: orgId,
      });

      if (error) throw new Error(error.message);

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      return {
        allowed: result.allowed ?? false,
        tier_name: result.tier_name ?? 'Current',
        max_allowed: result.max_allowed ?? 0,
        current_active: result.current_active ?? 0,
      };
    },
    enabled: !!orgId,
    staleTime: 30 * 1000,
    gcTime: 2 * 60 * 1000,
  });
}
