/**
 * usePublicChallenges — Fetches active public challenges for the challenge feed.
 * Extracts Supabase query from ChallengeFeed per R2 layer separation.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface PublicChallenge {
  id: string;
  hook: string | null;
  reward_amount: number | null;
  currency_code: string | null;
  access_type: string;
  complexity_level: string | null;
  min_star_tier: number;
  published_at: string | null;
  closing_date: string | null;
  industry_segment: { name: string } | null;
}

const CHALLENGE_SELECT = [
  'id', 'hook', 'reward_amount', 'currency_code', 'access_type',
  'complexity_level', 'min_star_tier', 'published_at', 'closing_date',
  'industry_segment:industry_segments(name)',
].join(', ');

export function usePublicChallenges(limit: number = 6) {
  return useQuery({
    queryKey: ['public-challenge-feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(CHALLENGE_SELECT)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PublicChallenge[];
    },
    staleTime: 5 * 60_000,
  });
}
