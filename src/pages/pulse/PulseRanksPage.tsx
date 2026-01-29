import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Users, TrendingUp, Calendar, Rocket, ChevronUp, ChevronDown, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { PulseLayout } from '@/components/pulse/layout';
import { useGlobalLeaderboard, useWeeklyLeaderboard, useMonthlyLeaderboard, useIndustryLeaderboard } from '@/hooks/queries/usePulseStats';
import { useIndustrySegments } from '@/hooks/queries/useIndustrySegments';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { cn } from '@/lib/utils';

export default function PulseRanksPage() {
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const [period, setPeriod] = useState<'all' | 'weekly' | 'monthly'>('weekly');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  
  const { data: industries, isLoading: industriesLoading } = useIndustrySegments();
  const { data: globalLeaderboard, isLoading: globalLoading } = useGlobalLeaderboard(100);
  const { data: weeklyLeaderboard, isLoading: weeklyLoading } = useWeeklyLeaderboard(100);
  const { data: monthlyLeaderboard, isLoading: monthlyLoading } = useMonthlyLeaderboard(100);
  const { data: industryLeaderboard, isLoading: industryLoading } = useIndustryLeaderboard(selectedIndustry || undefined, 100);

  const isLoading = selectedIndustry 
    ? industryLoading 
    : (period === 'all' ? globalLoading : period === 'monthly' ? monthlyLoading : weeklyLoading);
  
  const leaderboard = selectedIndustry 
    ? industryLeaderboard 
    : (period === 'all' ? globalLeaderboard : period === 'monthly' ? monthlyLeaderboard : weeklyLeaderboard);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return { emoji: '🥇', color: 'text-yellow-500' };
    if (rank === 2) return { emoji: '🥈', color: 'text-gray-400' };
    if (rank === 3) return { emoji: '🥉', color: 'text-amber-600' };
    return { emoji: `#${rank}`, color: 'text-muted-foreground' };
  };

  const handleProfileClick = (providerId: string) => {
    navigate(`/pulse/profile/${providerId}`);
  };

  const isCurrentUser = (providerId: string) => provider?.id === providerId;

  return (
    <PulseLayout title="Galaxy Leaderboard">
      <div className="max-w-lg mx-auto">
        {/* Header Stats */}
        <div className="p-4 border-b" role="region" aria-label="Leaderboard statistics">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <Trophy className="h-6 w-6 mx-auto mb-1 text-yellow-500" aria-hidden="true" />
              <p className="text-2xl font-bold">{leaderboard?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Ranked</p>
            </div>
            <div>
              <TrendingUp className="h-6 w-6 mx-auto mb-1 text-green-500" aria-hidden="true" />
              <p className="text-2xl font-bold">
                {leaderboard?.[0]?.total_xp?.toLocaleString() || 0}
              </p>
              <p className="text-xs text-muted-foreground">Top XP</p>
            </div>
            <div>
              <Users className="h-6 w-6 mx-auto mb-1 text-blue-500" aria-hidden="true" />
              <p className="text-2xl font-bold">
                {leaderboard?.[0]?.current_level || 1}
              </p>
              <p className="text-xs text-muted-foreground">Max Level</p>
            </div>
          </div>
        </div>

        {/* Industry Filter Tabs */}
        <div className="border-b">
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-2 p-4">
              <Button
                variant={selectedIndustry === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedIndustry(null)}
                className="flex-shrink-0"
              >
                All Industries
              </Button>
              {industriesLoading ? (
                <>
                  <Skeleton className="h-8 w-24 flex-shrink-0" />
                  <Skeleton className="h-8 w-28 flex-shrink-0" />
                  <Skeleton className="h-8 w-20 flex-shrink-0" />
                </>
              ) : (
                industries?.map((industry) => (
                  <Button
                    key={industry.id}
                    variant={selectedIndustry === industry.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedIndustry(industry.id)}
                    className="flex-shrink-0"
                  >
                    {industry.name}
                  </Button>
                ))
              )}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>

        {/* Period Tabs (only show when no industry selected) */}
        {!selectedIndustry && (
          <Tabs value={period} onValueChange={(v) => setPeriod(v as 'all' | 'weekly' | 'monthly')} className="w-full">
            <div className="px-4 pt-4">
              <TabsList className="w-full">
                <TabsTrigger value="weekly" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                  This Week
                </TabsTrigger>
                <TabsTrigger value="monthly" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" aria-hidden="true" />
                  This Month
                </TabsTrigger>
                <TabsTrigger value="all" className="flex-1">
                  <Trophy className="h-4 w-4 mr-2" aria-hidden="true" />
                  All Time
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        )}

        {/* Leaderboard List */}
        <div className="mt-4">
          {isLoading ? (
            <div className="p-4 space-y-3" aria-label="Loading rankings">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : !leaderboard || leaderboard.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Rocket className="h-8 w-8 text-primary" aria-hidden="true" />
              </div>
              <p className="text-lg font-medium mb-2">No rankings yet</p>
              <p className="text-muted-foreground text-sm mb-6">
                {selectedIndustry 
                  ? "No one has ranked in this industry yet. Be the first!"
                  : "Start creating content to earn XP and climb the ranks!"}
              </p>
              <Button onClick={() => navigate('/pulse/create')}>
                Start Creating
              </Button>
            </div>
          ) : (
            <div className="p-4 space-y-2" role="list" aria-label={`${selectedIndustry ? 'Industry' : (period === 'all' ? 'All time' : 'Weekly')} leaderboard`}>
              {leaderboard.map((entry) => {
                const { emoji, color } = getRankBadge(entry.rank);
                const initials = entry.provider_name
                  ?.split(' ')
                  .map(n => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2) || 'P';
                const isCurrent = isCurrentUser(entry.provider_id);

                return (
                  <Card
                    key={entry.provider_id}
                    className={cn(
                      "transition-colors cursor-pointer hover:bg-accent/50",
                      entry.rank <= 3 && "border-primary/30 bg-primary/5",
                      isCurrent && "ring-2 ring-primary/50 bg-primary/10"
                    )}
                    onClick={() => handleProfileClick(entry.provider_id)}
                    role="listitem"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && handleProfileClick(entry.provider_id)}
                    aria-label={`${entry.provider_name}, Rank ${entry.rank}, ${entry.total_xp} XP${isCurrent ? ' (You)' : ''}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      {/* Rank */}
                      <div className={cn("w-10 text-center font-bold", color)} aria-hidden="true">
                        {entry.rank <= 3 ? (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">{entry.provider_name}</p>
                          {isCurrent && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Level {entry.current_level}
                        </p>
                      </div>

                      {/* XP and Change */}
                      <div className="text-right">
                        <p className="font-bold text-primary">
                          {entry.total_xp?.toLocaleString() || 0}
                        </p>
                        <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                          <span>XP</span>
                          {/* Rank position change indicator */}
                          {entry.rank_change !== undefined && entry.rank_change !== 0 && (
                            <Badge 
                              variant="outline" 
                              className={cn(
                                "text-[10px] px-1 py-0",
                                entry.rank_change > 0 
                                  ? "text-green-600 border-green-200" 
                                  : "text-red-600 border-red-200"
                              )}
                            >
                              {entry.rank_change > 0 ? (
                                <>
                                  <ChevronUp className="h-3 w-3" aria-hidden="true" />
                                  {entry.rank_change}
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="h-3 w-3" aria-hidden="true" />
                                  {Math.abs(entry.rank_change)}
                                </>
                              )}
                            </Badge>
                          )}
                          {entry.rank_change === 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground border-muted">
                              <Minus className="h-3 w-3" aria-hidden="true" />
                            </Badge>
                          )}
                          {/* XP change for weekly view */}
                          {entry.xp_change !== undefined && entry.xp_change > 0 && (
                            <Badge variant="outline" className="text-[10px] px-1 py-0 text-primary border-primary/30">
                              +{entry.xp_change}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PulseLayout>
  );
}
