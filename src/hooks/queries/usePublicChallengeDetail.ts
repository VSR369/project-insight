/**
 * usePublicChallengeDetail — Fetches a single public challenge by ID.
 * Extracted from ChallengeDetailPublic per R2 layer separation.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ChallengeDetail {
  id: string;
  hook: string | null;
  description: string | null;
  problem_statement: string | null;
  reward_amount: number | null;
  currency_code: string | null;
  access_type: string;
  min_star_tier: number;
  complexity_level: string | null;
  published_at: string | null;
  closing_date: string | null;
  scope: string | null;
  evaluation_criteria: unknown;
  is_active: boolean;
}

const DETAIL_COLS = [
  'id', 'hook', 'description', 'problem_statement', 'reward_amount',
  'currency_code', 'access_type', 'min_star_tier', 'complexity_level',
  'published_at', 'closing_date', 'scope', 'evaluation_criteria', 'is_active',
].join(', ');

export function usePublicChallengeDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['public-challenge-detail', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(DETAIL_COLS)
        .eq('id', id!)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .single();
      if (error) throw new Error(error.message);
      return data as unknown as ChallengeDetail;
    },
    enabled: !!id,
    staleTime: 5 * 60_000,
  });
}
