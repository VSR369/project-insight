/**
 * ReputationBadge - Display user reputation tier
 */

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getReputationTier } from '@/constants/pulseCards.constants';
import { cn } from '@/lib/utils';

interface ReputationBadgeProps {
  reputation: number;
  size?: 'xs' | 'sm' | 'default';
  showPoints?: boolean;
  className?: string;
}

export function ReputationBadge({
  reputation,
  size = 'default',
  showPoints = false,
  className,
}: ReputationBadgeProps) {
  const tier = getReputationTier(reputation);

  const sizeClasses = {
    xs: 'text-[10px] px-1.5 py-0',
    sm: 'text-xs px-2 py-0.5',
    default: 'text-sm px-2.5 py-1',
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "inline-flex items-center gap-1 font-medium border-0 bg-muted/50",
            sizeClasses[size],
            className
          )}
        >
          <span aria-hidden="true">{tier.emoji}</span>
          {showPoints ? (
            <span>{reputation} pts</span>
          ) : (
            <span className="sr-only">{tier.name}</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent side="top" align="center">
        <div className="text-center">
          <p className="font-semibold">{tier.emoji} {tier.name}</p>
          <p className="text-xs text-muted-foreground">{tier.description}</p>
          <p className="text-xs mt-1">{reputation} reputation points</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
