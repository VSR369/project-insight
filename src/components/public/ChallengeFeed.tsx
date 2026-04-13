/**
 * ChallengeFeed — Public challenge feed per Spec 6.4
 * Fetches and displays active public challenges as cards
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { ChallengeCard } from './ChallengeCard';
import { cn } from '@/lib/utils';

interface ChallengeFeedProps {
  limit?: number;
  className?: string;
}

interface PublicChallenge {
  id: string;
  hook: string | null;
  reward_amount: number | null;
  currency_code: string | null;
  access_type: string;
  complexity_level: string | null;
  min_star_tier: number;
  published_at: string | null;
  industry_segment: { name: string } | null;
}

const FEED_COLS = [
  'id', 'hook', 'reward_amount', 'currency_code',
  'access_type', 'complexity_level', 'min_star_tier', 'published_at',
].join(', ');

export function ChallengeFeed({ limit = 6, className }: ChallengeFeedProps) {
  const { data: challenges, isLoading, isError } = useQuery({
    queryKey: ['public-challenge-feed', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('challenges')
        .select(`${FEED_COLS}, industry_segment:industry_segments!challenges_industry_segment_id_fkey(name)`)
        .eq('is_active', true)
        .eq('is_deleted', false)
        .order('published_at', { ascending: false })
        .limit(limit);

      if (error) throw new Error(error.message);
      return (data ?? []) as PublicChallenge[];
    },
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return (
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
        {Array.from({ length: limit }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !challenges?.length) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        No challenges available right now. Check back soon!
      </p>
    );
  }

  return (
    <div className={cn('grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4', className)}>
      {challenges.map((c) => (
        <ChallengeCard
          key={c.id}
          id={c.id}
          hook={c.hook}
          rewardAmount={c.reward_amount}
          currencyCode={c.currency_code}
          accessType={c.access_type}
          complexityLevel={c.complexity_level}
          publishedAt={c.published_at}
          industryName={c.industry_segment?.name ?? null}
          minStarTier={c.min_star_tier}
        />
      ))}
    </div>
  );
}
