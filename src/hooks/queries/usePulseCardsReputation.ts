/**
 * PulsePages - Reputation Hooks
 * Reputation tracking and gating
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { 
  getReputationTier, 
  canPerformAction, 
  REPUTATION_GATES,
  type ReputationTierKey 
} from '@/constants/pulseCards.constants';

// ===========================================
// Types
// ===========================================

export interface ProviderReputation {
  total: number;
  tier: ReturnType<typeof getReputationTier>;
  canStartCard: boolean;
  canBuild: boolean;
  canVote: boolean;
  canFlag: boolean;
  isTrustCouncil: boolean;
}

export interface ReputationLogEntry {
  id: string;
  provider_id: string;
  action_type: string;
  points_delta: number;
  reason: string | null;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

// ===========================================
// Query: Get provider's cards reputation
// ===========================================

export function usePulseCardsReputation(providerId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-cards-reputation', providerId],
    queryFn: async (): Promise<ProviderReputation> => {
      if (!providerId) {
        return {
          total: 0,
          tier: getReputationTier(0),
          canStartCard: false,
          canBuild: false,
          canVote: false,
          canFlag: false,
          isTrustCouncil: false,
        };
      }

      // Try using RPC function first
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('pulse_cards_get_reputation', { p_provider_id: providerId });

      let total = 0;

      if (rpcError || rpcData === null) {
        // Fallback to manual calculation
        const { data, error } = await supabase
          .from('pulse_cards_reputation_log')
          .select('points_delta')
          .eq('provider_id', providerId);

        if (error) throw new Error(error.message);
        total = data?.reduce((sum, log) => sum + log.points_delta, 0) || 0;
      } else {
        total = rpcData;
      }

      const tier = getReputationTier(total);

      return {
        total,
        tier,
        canStartCard: canPerformAction(total, 'START_CARD').allowed,
        canBuild: canPerformAction(total, 'BUILD_ON_CARD').allowed,
        canVote: canPerformAction(total, 'VOTE_LAYER').allowed,
        canFlag: canPerformAction(total, 'FLAG_CONTENT').allowed,
        isTrustCouncil: canPerformAction(total, 'TRUST_COUNCIL_ELIGIBLE').allowed,
      };
    },
    enabled: !!providerId,
    staleTime: 60 * 1000, // 1 minute
  });
}

// ===========================================
// Query: Get provider's reputation history
// ===========================================

export function usePulseCardsReputationHistory(providerId: string | undefined, limit: number = 20) {
  return useQuery({
    queryKey: ['pulse-cards-reputation-history', providerId, limit],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await supabase
        .from('pulse_cards_reputation_log')
        .select('*')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return data as ReputationLogEntry[];
    },
    enabled: !!providerId,
  });
}

// ===========================================
// Helper: Check if user can perform action
// ===========================================

export function useCanPerformCardAction(
  providerId: string | undefined,
  action: keyof typeof REPUTATION_GATES
) {
  const { data: reputation, isLoading } = usePulseCardsReputation(providerId);

  if (isLoading || !reputation) {
    return {
      allowed: false,
      loading: isLoading,
      requiredRep: REPUTATION_GATES[action],
      currentRep: 0,
      message: 'Loading reputation...',
    };
  }

  const check = canPerformAction(reputation.total, action);

  return {
    ...check,
    loading: false,
    message: check.allowed
      ? undefined
      : `You need ${check.requiredRep} reputation to perform this action. You have ${check.currentRep}.`,
  };
}
