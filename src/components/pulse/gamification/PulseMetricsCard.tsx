/**
 * Pulse Metrics Card Component
 * Displays weekly impressions, engagement rate, top content, follower growth, rank change
 * Per Phase E specification - PULSE-001 to PULSE-010
 */

import { TrendingUp, Eye, Flame, Users, Trophy, ArrowUp, ArrowDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePulseMetrics } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface PulseMetricsCardProps {
  providerId: string;
  className?: string;
}

export function PulseMetricsCard({ providerId, className }: PulseMetricsCardProps) {
  const { data: metrics, isLoading } = usePulseMetrics(providerId);

  if (isLoading) {
    return (
      <Card className={cn("border-primary/20", className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!metrics) return null;

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <Card className={cn("border-primary/20 bg-gradient-to-br from-primary/5 to-transparent", className)}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" aria-hidden="true" />
          <h3 className="font-semibold text-sm">Your Pulse Metrics</h3>
        </div>

        {/* Primary Metrics Row */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {/* Impressions */}
          <div className="text-center p-3 rounded-lg bg-background/50">
            <Eye className="h-4 w-4 mx-auto mb-1 text-blue-500" aria-hidden="true" />
            <p className="text-xl font-bold">{formatNumber(metrics.impressionsThisWeek)}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Impressions</p>
          </div>

          {/* Engagement Rate */}
          <div className="text-center p-3 rounded-lg bg-background/50">
            <Flame className="h-4 w-4 mx-auto mb-1 text-orange-500" aria-hidden="true" />
            <p className="text-xl font-bold">{metrics.engagementRate.toFixed(1)}%</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Eng. Rate</p>
          </div>

          {/* Follower Growth */}
          <div className="text-center p-3 rounded-lg bg-background/50">
            <Users className="h-4 w-4 mx-auto mb-1 text-green-500" aria-hidden="true" />
            <div className="flex items-center justify-center gap-1">
              {metrics.followerGrowth >= 0 ? (
                <ArrowUp className="h-3 w-3 text-green-500" aria-hidden="true" />
              ) : (
                <ArrowDown className="h-3 w-3 text-red-500" aria-hidden="true" />
              )}
              <p className="text-xl font-bold">{metrics.followerGrowth >= 0 ? '+' : ''}{metrics.followerGrowth}</p>
            </div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Followers</p>
          </div>
        </div>

        {/* Secondary Info Row */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {/* Top Performing Content */}
          {metrics.topContent && (
            <div className="p-2 rounded-lg bg-background/30 truncate">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <Flame className="h-3 w-3" aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide">Top Post</span>
              </div>
              <p className="font-medium text-xs truncate" title={metrics.topContent.title}>
                {metrics.topContent.title || 'Untitled'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {metrics.topContent.fireCount} 🔥 • {metrics.topContent.goldCount} 🥇
              </p>
            </div>
          )}

          {/* Rank Info */}
          {metrics.industryRank && (
            <div className="p-2 rounded-lg bg-background/30">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-0.5">
                <Trophy className="h-3 w-3" aria-hidden="true" />
                <span className="text-[10px] uppercase tracking-wide">Industry Rank</span>
              </div>
              <div className="flex items-center gap-1">
                <p className="font-medium text-xs">#{metrics.industryRank.rank} {metrics.industryRank.industryName}</p>
                {metrics.industryRank.change !== 0 && (
                  <span className={cn(
                    "text-[10px] font-medium",
                    metrics.industryRank.change > 0 ? "text-green-500" : "text-red-500"
                  )}>
                    ({metrics.industryRank.change > 0 ? '↑' : '↓'}{Math.abs(metrics.industryRank.change)})
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
