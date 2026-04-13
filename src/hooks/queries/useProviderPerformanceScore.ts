/**
 * Provider Performance Score Hook
 * 
 * React Query hook for reading provider_performance_scores.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DimensionScores } from '@/services/enrollment/performanceScoreService';

const PERF_SCORE_KEY = 'provider-performance-scores';

export interface ProviderPerformanceScore {
  id: string;
  provider_id: string;
  quality_score: number;
  consistency_score: number;
  engagement_score: number;
  responsiveness_score: number;
  expertise_depth_score: number;
  community_impact_score: number;
  composite_score: number;
  computed_at: string;
}

/**
 * Fetch performance scores for a provider
 */
export function useProviderPerformanceScore(providerId?: string) {
  return useQuery({
    queryKey: [PERF_SCORE_KEY, providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_performance_scores')
        .select('id, provider_id, quality_score, consistency_score, engagement_score, responsiveness_score, expertise_depth_score, community_impact_score, composite_score, computed_at')
        .eq('provider_id', providerId!)
        .single();
      if (error) {
        if (error.code === 'PGRST116') return null; // No row yet
        throw new Error(error.message);
      }
      return data as ProviderPerformanceScore;
    },
    enabled: !!providerId,
    staleTime: 5 * 60_000, // 5 min — scores computed nightly
  });
}

/**
 * Extract dimension scores from a performance score record.
 */
export function extractDimensionScores(
  score: ProviderPerformanceScore | null
): DimensionScores | null {
  if (!score) return null;
  return {
    quality: score.quality_score,
    consistency: score.consistency_score,
    engagement: score.engagement_score,
    responsiveness: score.responsiveness_score,
    expertise_depth: score.expertise_depth_score,
    community_impact: score.community_impact_score,
  };
}
