/**
 * ChallengeCard — Public challenge card per Spec 6.4
 * Shows title, domain, reward, complexity badge, access badge, days remaining
 */

import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Trophy, Lock, Globe, Clock } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChallengeCardProps {
  id: string;
  hook: string | null;
  rewardAmount: number | null;
  currencyCode: string | null;
  accessType: string;
  complexityLevel: string | null;
  publishedAt: string | null;
  industryName: string | null;
  minStarTier: number;
  className?: string;
}

const COMPLEXITY_COLORS: Record<string, string> = {
  basic: 'bg-green-500/10 text-green-700 border-green-500/20',
  intermediate: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  advanced: 'bg-red-500/10 text-red-700 border-red-500/20',
};

export function ChallengeCard({
  id,
  hook,
  rewardAmount,
  currencyCode,
  accessType,
  complexityLevel,
  publishedAt,
  industryName,
  minStarTier,
  className,
}: ChallengeCardProps) {
  const navigate = useNavigate();

  const daysAgo = publishedAt
    ? differenceInDays(new Date(), parseISO(publishedAt))
    : null;

  const formattedReward = rewardAmount
    ? `${(currencyCode || 'USD')} ${rewardAmount.toLocaleString()}`
    : null;

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow border',
        className,
      )}
      onClick={() => navigate(`/challenges/${id}`)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-semibold text-sm leading-snug line-clamp-2">
          {hook || 'Untitled Challenge'}
        </h3>

        {/* Domain / Industry */}
        {industryName && (
          <p className="text-xs text-muted-foreground">{industryName}</p>
        )}

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5">
          {/* Complexity */}
          {complexityLevel && (
            <Badge
              variant="outline"
              className={cn(
                'text-[10px] px-1.5 py-0 capitalize',
                COMPLEXITY_COLORS[complexityLevel] || '',
              )}
            >
              {complexityLevel}
            </Badge>
          )}

          {/* Access type */}
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {accessType === 'open' ? (
              <Globe className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
            ) : (
              <Lock className="h-2.5 w-2.5 mr-0.5" aria-hidden="true" />
            )}
            {accessType === 'open' ? 'Open' : 'Restricted'}
          </Badge>

          {/* Min star tier */}
          {minStarTier > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {'⭐'.repeat(minStarTier)} min
            </Badge>
          )}
        </div>

        {/* Footer: reward + time */}
        <div className="flex items-center justify-between pt-1 border-t">
          {formattedReward ? (
            <span className="flex items-center gap-1 text-xs font-medium text-primary">
              <Trophy className="h-3 w-3" aria-hidden="true" />
              {formattedReward}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">No prize listed</span>
          )}

          {daysAgo !== null && (
            <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
              <Clock className="h-2.5 w-2.5" aria-hidden="true" />
              {daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
