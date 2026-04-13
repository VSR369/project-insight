/**
 * Provider Performance Score Hook
 * 
 * React Query hook for reading provider_performance_scores (spec-aligned dimensions).
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { DimensionScores } from '@/services/enrollment/performanceScoreService';

const PERF_SCORE_KEY = 'provider-performance-scores';

export interface ProviderPerformanceScore {
  id: string;
  provider_id: string;
  score_community_engagement: number;
  score_abstracts_submitted: number;
  score_solution_quality: number;
  score_complexity_handled: number;
  score_win_achievement: number;
  score_knowledge_contrib: number;
  composite_score: number;
  computed_at: string;
  score_date: string;
  community_posts_count: number;
  community_helpful_votes: number;
  articles_written: number;
  peer_reviews_given: number;
  abstracts_submitted: number;
  full_solutions_submitted: number;
  solutions_accepted: number;
  wins_platinum: number;
  wins_gold: number;
  wins_silver: number;
  avg_challenge_complexity: number;
}

const SCORE_COLUMNS = [
  'id', 'provider_id',
  'score_community_engagement', 'score_abstracts_submitted', 'score_solution_quality',
  'score_complexity_handled', 'score_win_achievement', 'score_knowledge_contrib',
  'composite_score', 'computed_at', 'score_date',
  'community_posts_count', 'community_helpful_votes', 'articles_written',
  'peer_reviews_given', 'abstracts_submitted', 'full_solutions_submitted',
  'solutions_accepted', 'wins_platinum', 'wins_gold', 'wins_silver',
  'avg_challenge_complexity',
].join(', ');

/**
 * Fetch latest performance scores for a provider
 */
export function useProviderPerformanceScore(providerId?: string) {
  return useQuery({
    queryKey: [PERF_SCORE_KEY, providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_performance_scores')
        .select(SCORE_COLUMNS)
        .eq('provider_id', providerId!)
        .order('score_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as unknown) as ProviderPerformanceScore | null;
    },
    enabled: !!providerId,
    staleTime: 5 * 60_000,
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
    community_engagement: score.score_community_engagement,
    abstracts_submitted: score.score_abstracts_submitted,
    solution_quality: score.score_solution_quality,
    complexity_handled: score.score_complexity_handled,
    win_achievement: score.score_win_achievement,
    knowledge_contrib: score.score_knowledge_contrib,
  };
}
