/**
 * Left Sidebar
 * Contains ProfileMiniCard, LeaderboardMiniWidget, and XP Progress Card
 */

import { Sparkles, Zap, Target, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LeaderboardMiniWidget, ProfileMiniCard } from '@/components/pulse/widgets';
import { useProviderStats, usePulseMetrics } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface LeftSidebarProps {
  providerId?: string;
  userId?: string;
  isFirstTime?: boolean;
  className?: string;
}

// XP required per level (simplified formula)
const getXpForLevel = (level: number) => level * 500;
const getXpProgress = (totalXp: number, level: number) => {
  const currentLevelXp = getXpForLevel(level);
  const nextLevelXp = getXpForLevel(level + 1);
  const xpIntoLevel = totalXp - currentLevelXp;
  const xpNeeded = nextLevelXp - currentLevelXp;
  return Math.min((xpIntoLevel / xpNeeded) * 100, 100);
};

export function LeftSidebar({ providerId, userId, isFirstTime, className }: LeftSidebarProps) {
  const { data: stats, isLoading: statsLoading } = useProviderStats(providerId || '');
  const { data: metrics, isLoading: metricsLoading } = usePulseMetrics(providerId || '');

  const isLoading = statsLoading || metricsLoading;

  return (
    <div className={cn("p-3 lg:p-4 space-y-3 lg:space-y-4 overflow-y-auto", className)}>
      {/* Profile Card */}
      {providerId && userId && (
        <ProfileMiniCard providerId={providerId} userId={userId} />
      )}

      {/* Galaxy Leaderboard */}
      <LeaderboardMiniWidget currentProviderId={providerId} isFirstTime={isFirstTime} />

      {/* XP Progress Card */}
      {providerId && (
        <Card>
          <CardHeader className="pb-2 p-3 lg:p-4">
            <CardTitle className="text-xs lg:text-sm font-medium flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-yellow-500" />
              Your Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 lg:space-y-3 p-3 lg:p-4 pt-0">
            {isLoading ? (
              <>
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-2 w-full" />
              </>
            ) : (
              <>
                {/* Level & XP */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center text-primary-foreground font-bold text-sm lg:text-base">
                      {stats?.current_level || 1}
                    </div>
                    <div>
                      <p className="text-xs lg:text-sm font-medium">Level {stats?.current_level || 1}</p>
                      <p className="text-[10px] lg:text-xs text-muted-foreground">
                        {(stats?.total_xp || 0).toLocaleString()} XP
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-[9px] lg:text-[10px]">
                    <Sparkles className="h-2.5 w-2.5 lg:h-3 lg:w-3 mr-0.5 lg:mr-1" />
                    {stats?.current_streak || 0} streak
                  </Badge>
                </div>

                {/* Progress to next level */}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Next Level</span>
                    <span>{getXpForLevel((stats?.current_level || 1) + 1).toLocaleString()} XP</span>
                  </div>
                  <Progress 
                    value={getXpProgress(stats?.total_xp || 0, stats?.current_level || 1)} 
                    className="h-2"
                  />
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <Target className="h-4 w-4 mx-auto mb-1 text-primary" />
                    <p className="text-lg font-bold">{metrics?.impressionsThisWeek || 0}</p>
                    <p className="text-[10px] text-muted-foreground">Impressions</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-muted/50">
                    <Award className="h-4 w-4 mx-auto mb-1 text-yellow-500" />
                    <p className="text-lg font-bold">{metrics?.industryRank?.rank || '-'}</p>
                    <p className="text-[10px] text-muted-foreground">Rank</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
