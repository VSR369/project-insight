import { useState } from 'react';
import { Trophy, Users, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PulseLayout } from '@/components/pulse/layout';
import { useGlobalLeaderboard, useWeeklyLeaderboard } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

export default function PulseRanksPage() {
  const [period, setPeriod] = useState<'all' | 'weekly'>('weekly');
  const { data: globalLeaderboard, isLoading: globalLoading } = useGlobalLeaderboard(10);
  const { data: weeklyLeaderboard, isLoading: weeklyLoading } = useWeeklyLeaderboard(10);

  const isLoading = period === 'all' ? globalLoading : weeklyLoading;
  const leaderboard = period === 'all' ? globalLeaderboard : weeklyLeaderboard;

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-500' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-400' };
    if (rank === 3) return { emoji: '🥉', color: 'text-amber-600' };
    return { emoji: `#${rank}`, color: 'text-muted-foreground' };
  };

  return (
    <PulseLayout title="Rankings">
      <div className="max-w-lg mx-auto">
        {/* Header Stats */}
        <div className="p-4 border-b">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{globalLeaderboard?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Ranked</p>
            </div>
            <div>
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">
                {globalLeaderboard?.[0]?.total_xp?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">Top XP</p>
            </div>
            <div>
              <Users className="h-6 w-6 mx-auto mb-1 text-blue-500" />
              <p className="text-2xl font-bold">
                {globalLeaderboard?.[0]?.current_level || 1}
              </p>
              <p className="text-xs text-muted-foreground">Max Level</p>
            </div>
          </div>
        </div>

        {/* Period Tabs */}
        <Tabs value={period} onValueChange={(v) => setPeriod(v as 'all' | 'weekly')} className="w-full">
          <div className="px-4 pt-4">
            <TabsList className="w-full">
              <TabsTrigger value="weekly" className="flex-1">
                <Calendar className="h-4 w-4 mr-2" />
                This Week
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1">
                <Trophy className="h-4 w-4 mr-2" />
                All Time
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value={period} className="mt-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : !leaderboard || leaderboard.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium mb-2">No rankings yet</p>
                <p className="text-muted-foreground text-sm">
                  Start creating content to earn XP and climb the ranks!
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {leaderboard.map((entry, index) => {
                  const rank = index + 1;
                  const { emoji, color } = getRankBadge(rank);
                  const providerName = `Provider ${entry.provider_id.slice(0, 8)}`;
                  const initials = 'P';

                  return (
                    <Card
                      key={entry.provider_id}
                      className={cn(
                        "transition-colors",
                        rank <= 3 && "border-primary/30 bg-primary/5"
                      )}
                    >
                      <CardContent className="p-3 flex items-center gap-3">
                        {/* Rank */}
                        <div className={cn("w-10 text-center font-bold", color)}>
                          {rank <= 3 ? (
                            <span className="text-2xl">{emoji}</span>
                          ) : (
                            <span className="text-lg">{emoji}</span>
                          )}
                        </div>

                        {/* Avatar */}
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {initials}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{providerName}</p>
                          <p className="text-xs text-muted-foreground">
                            Level {entry.current_level}
                          </p>
                        </div>

                        {/* XP */}
                        <div className="text-right">
                          <p className="font-bold text-primary">
                            {entry.total_xp?.toLocaleString() || 0}
                          </p>
                          <p className="text-xs text-muted-foreground">XP</p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PulseLayout>
  );
}
