/**
 * Leaderboard Mini Widget
 * Shows top 5 ranked providers in the Galaxy leaderboard
 * Used in left sidebar of desktop layout
 */

import { useNavigate } from 'react-router-dom';
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useWeeklyLeaderboard } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface LeaderboardMiniWidgetProps {
  currentProviderId?: string;
  isFirstTime?: boolean;
  className?: string;
}

export function LeaderboardMiniWidget({ currentProviderId, isFirstTime, className }: LeaderboardMiniWidgetProps) {
  const navigate = useNavigate();
  const { data: leaderboard, isLoading } = useWeeklyLeaderboard(10);

  const top5 = leaderboard?.slice(0, 5) || [];
  const currentUserEntry = currentProviderId 
    ? leaderboard?.find(e => e.provider_id === currentProviderId)
    : null;
  const currentUserRank = currentUserEntry?.rank;
  const isCurrentUserInTop5 = currentUserRank && currentUserRank <= 5;

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
    if (rank === 2) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (rank === 3) return <Trophy className="h-4 w-4 text-amber-600" />;
    return null;
  };

  const getRankChange = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-500" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Galaxy Leaders
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">Weekly</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {isFirstTime ? (
          <div className="text-center py-6">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              Build your profile to join the rankings!
            </p>
          </div>
        ) : top5.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No data yet this week
          </p>
        ) : (
          <>
            {top5.map((entry, index) => {
              const isCurrentUser = entry.provider_id === currentProviderId;
              return (
                <div
                  key={entry.provider_id}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg transition-colors cursor-pointer hover:bg-muted/50",
                    isCurrentUser && "bg-primary/10 border border-primary/20"
                  )}
                  onClick={() => navigate(`/pulse/profile/${entry.provider_id}`)}
                >
                  {/* Rank */}
                  <div className="w-6 flex justify-center">
                    {getRankIcon(entry.rank) || (
                      <span className="text-sm font-medium text-muted-foreground">
                        {entry.rank}
                      </span>
                    )}
                  </div>

                  {/* Avatar */}
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={cn(
                      "text-xs",
                      index === 0 && "bg-yellow-500/20 text-yellow-600",
                      index === 1 && "bg-gray-300/30 text-gray-600",
                      index === 2 && "bg-amber-500/20 text-amber-600"
                    )}>
                      {getInitials(entry.provider_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name & XP */}
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium truncate",
                      isCurrentUser && "text-primary"
                    )}>
                      {isCurrentUser ? 'You' : entry.provider_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      +{entry.xp_change.toLocaleString()} XP
                    </p>
                  </div>

                  {/* Rank Change */}
                  <div className="flex items-center">
                    {getRankChange(entry.rank_change)}
                  </div>
                </div>
              );
            })}

            {/* Current user if not in top 5 */}
            {currentUserEntry && !isCurrentUserInTop5 && (
              <>
                <div className="border-t my-2" />
                <div
                  className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20 cursor-pointer"
                  onClick={() => navigate(`/pulse/profile/${currentUserEntry.provider_id}`)}
                >
                  <div className="w-6 flex justify-center">
                    <span className="text-sm font-medium">{currentUserEntry.rank}</span>
                  </div>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(currentUserEntry.provider_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">You</p>
                    <p className="text-xs text-muted-foreground">
                      +{currentUserEntry.xp_change.toLocaleString()} XP
                    </p>
                  </div>
                  {getRankChange(currentUserEntry.rank_change)}
                </div>
              </>
            )}
          </>
        )}

        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-xs"
          onClick={() => navigate('/pulse/ranks')}
        >
          View Full Leaderboard
        </Button>
      </CardContent>
    </Card>
  );
}
