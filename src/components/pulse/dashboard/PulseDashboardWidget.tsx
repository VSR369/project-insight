/**
 * Pulse Dashboard Widget
 * 
 * Shows Pulse stats, XP progress, streak, and quick actions on the provider dashboard.
 * Per Industry Pulse roadmap Phase 8.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Zap, Trophy, Gift, ArrowRight, Sparkles, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCurrentProvider } from '@/hooks/queries/useProvider';
import { useProviderStats, useTodayLootBox, useTodayStandup } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

export function PulseDashboardWidget() {
  const navigate = useNavigate();
  const { data: provider } = useCurrentProvider();
  const { data: stats, isLoading: statsLoading } = useProviderStats(provider?.id);
  const { data: lootBox } = useTodayLootBox(provider?.id);
  const { data: standup } = useTodayStandup(provider?.id);

  // Check if Pulse is not yet active for this user
  const isPulseActive = !!stats;
  const hasUnclaimedLootBox = lootBox && !lootBox.opened_at;
  const hasCompletedStandup = !!standup?.completed_at;

  if (statsLoading) {
    return (
      <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Industry Pulse</CardTitle>
          </div>
          <CardDescription>Your engagement hub</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-8 w-full" />
        </CardContent>
      </Card>
    );
  }

  // New user - show invitation to join Pulse
  if (!isPulseActive) {
    return (
      <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-background">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Industry Pulse</CardTitle>
          </div>
          <CardDescription>Connect with industry professionals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-orange-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">Start your Pulse journey</p>
              <p className="text-xs text-muted-foreground">
                Share insights, earn XP, and climb the leaderboard
              </p>
            </div>
          </div>
          <Button 
            className="w-full gap-2" 
            onClick={() => navigate('/pulse/feed')}
          >
            <Flame className="h-4 w-4" />
            Explore Pulse
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Active user - show stats
  return (
    <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-background">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-lg">Industry Pulse</CardTitle>
          </div>
          <Badge variant="secondary" className="gap-1">
            <Trophy className="h-3 w-3" />
            Level {stats.current_level}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* XP Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Zap className="h-3.5 w-3.5 text-yellow-500" />
              {stats.levelProgress.current.toLocaleString()} / {stats.levelProgress.required.toLocaleString()} XP
            </span>
            <span className="text-xs text-muted-foreground">
              Level {stats.current_level + 1}
            </span>
          </div>
          <Progress 
            value={stats.levelProgress.progress} 
            className="h-2"
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-orange-500">{Number(stats.total_xp).toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total XP</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <p className="text-lg font-bold text-yellow-500">{stats.gold_token_balance}</p>
            <p className="text-xs text-muted-foreground">Gold</p>
          </div>
          <div className="p-2 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1">
              <p className="text-lg font-bold text-red-500">{stats.current_streak}</p>
              <Flame className={cn(
                "h-4 w-4",
                stats.current_streak >= 7 ? "text-red-500" : 
                stats.current_streak >= 3 ? "text-orange-500" : "text-muted-foreground"
              )} />
            </div>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
        </div>

        {/* Daily Actions */}
        <div className="flex gap-2">
          {hasUnclaimedLootBox && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1 border-yellow-500/30 text-yellow-600 hover:bg-yellow-500/10"
              onClick={() => navigate('/pulse/profile')}
            >
              <Gift className="h-4 w-4" />
              Claim Loot
            </Button>
          )}
          {!hasCompletedStandup && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1 gap-1 border-green-500/30 text-green-600 hover:bg-green-500/10"
              onClick={() => navigate('/pulse/feed')}
            >
              <Target className="h-4 w-4" />
              Daily Standup
            </Button>
          )}
        </div>

        {/* Quick Navigation */}
        <Button 
          variant="ghost" 
          className="w-full justify-between text-muted-foreground hover:text-foreground"
          onClick={() => navigate('/pulse/feed')}
        >
          <span className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-orange-500" />
            Go to Pulse
          </span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
}
