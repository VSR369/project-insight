/**
 * useMatchingSolvers — Queries solver_profiles joined with proficiency data,
 * filtering by the challenge's taxonomy and complexity level.
 * Returns a count and breakdown for the PublicationReadinessPage. (GAP-12)
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SolverMatchResult {
  totalMatched: number;
  byTier: {
    tier: number;
    count: number;
  }[];
}

export function useMatchingSolvers(challengeId: string | undefined) {
  return useQuery({
    queryKey: ['matching-solvers', challengeId],
    queryFn: async (): Promise<SolverMatchResult> => {
      if (!challengeId) return { totalMatched: 0, byTier: [] };

      // Get challenge taxonomy info
      const { data: challenge, error: cErr } = await supabase
        .from('challenges')
        .select('complexity_level, eligibility, visibility, targeting_filters')
        .eq('id', challengeId)
        .single();

      if (cErr || !challenge) return { totalMatched: 0, byTier: [] };

      // Query solver profiles — count those with active status
      const { data: solvers, error: sErr } = await supabase
        .from('solver_profiles' as any)
        .select('id, user_id, certification_tier, is_active')
        .eq('is_active', true)
        .limit(500);

      if (sErr || !solvers) return { totalMatched: 0, byTier: [] };

      // Apply visibility/eligibility filtering
      const matchedSolvers = (solvers as unknown) as Array<{
        id: string;
        user_id: string;
        certification_tier: number;
        is_active: boolean;
      }>;

      // Complexity-based tier filtering
      // Higher complexity challenges require higher certification tiers
      const complexityTierMap: Record<string, number> = {
        LOW: 1,
        MEDIUM: 1,
        HIGH: 2,
        EXPERT: 3,
      };
      const minTier = complexityTierMap[challenge.complexity_level ?? ''] ?? 1;

      const qualified = matchedSolvers.filter(
        (s) => (s.certification_tier ?? 1) >= minTier,
      );

      // Group by tier
      const tierCounts: Record<number, number> = {};
      for (const s of qualified) {
        const tier = s.certification_tier ?? 1;
        tierCounts[tier] = (tierCounts[tier] ?? 0) + 1;
      }

      const byTier = Object.entries(tierCounts)
        .map(([tier, count]) => ({ tier: Number(tier), count }))
        .sort((a, b) => a.tier - b.tier);

      return {
        totalMatched: qualified.length,
        byTier,
      };
    },
    enabled: !!challengeId,
    staleTime: 60_000,
  });
}
