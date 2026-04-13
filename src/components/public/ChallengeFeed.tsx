/**
 * ChallengeFeed — Public challenge feed per Spec 6.4
 * Uses usePublicChallenges hook (R2 compliance)
 */

import { Skeleton } from '@/components/ui/skeleton';
import { ChallengeCard } from './ChallengeCard';
import { usePublicChallenges } from '@/hooks/queries/usePublicChallenges';
import { cn } from '@/lib/utils';

interface ChallengeFeedProps {
  limit?: number;
  className?: string;
}

export function ChallengeFeed({ limit = 6, className }: ChallengeFeedProps) {
  const { data: challenges, isLoading, isError } = usePublicChallenges(limit);

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
          closingDate={c.closing_date}
          industryName={c.industry_segment?.name ?? null}
          minStarTier={c.min_star_tier}
        />
      ))}
    </div>
  );
}
