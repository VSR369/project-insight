/**
 * Daily Standup Page
 * Full standup experience with streak calendar, rewards, and industry highlights
 */

import { useState, useEffect } from 'react';
import { 
  Zap, Clock, Sparkles, Flame, TrendingUp, Calendar, 
  Trophy, Gift, Star, ChevronLeft, Check, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PulseLayout } from '@/components/pulse/layout';
import { useTodayStandup, useCompleteStandup, useProviderStats } from '@/hooks/queries/usePulseStats';
import { useIsFirstTimeProvider } from '@/hooks/useIsFirstTimeProvider';
import { cn } from '@/lib/utils';

// Generate last 7 days for streak visualization
const getLast7Days = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date,
      dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNum: date.getDate(),
      isToday: i === 0,
    });
  }
  return days;
};

export default function PulseStandupPage() {
  const navigate = useNavigate();
  const { provider, isLoading: providerLoading } = useIsFirstTimeProvider();
  const providerId = provider?.id || '';
  
  const { data: todayStandup, isLoading: standupLoading } = useTodayStandup(providerId);
  const { data: stats, isLoading: statsLoading } = useProviderStats(providerId);
  const { mutate: completeStandup, isPending } = useCompleteStandup();
  
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(100);

  const isLoading = providerLoading || standupLoading || statsLoading;
  const isCompleted = !!todayStandup?.completed_at;
  const currentStreak = stats?.current_streak || 0;
  const last7Days = getLast7Days();

  // Calculate time until midnight
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const totalDayMs = 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      const elapsed = totalDayMs - diff;
      setProgressPercent(100 - (elapsed / totalDayMs) * 100);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleComplete = () => {
    if (providerId) {
      completeStandup({ providerId, updatesViewed: 0 });
    }
  };

  // Simulate streak data (in real app, fetch from API)
  const streakDays = new Set([
    ...Array.from({ length: Math.min(currentStreak, 6) }, (_, i) => 6 - i)
  ]);

  return (
    <PulseLayout 
      breadcrumb={{
        parentLabel: 'Feed',
        parentPath: '/pulse/feed',
        currentLabel: 'Daily Standup',
      }}
    >
      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Zap className={cn(
              "h-10 w-10",
              isCompleted ? "text-green-500" : "text-primary"
            )} />
          </div>
          <h1 className="text-2xl font-bold">Daily Standup</h1>
          <p className="text-muted-foreground">
            {isCompleted 
              ? "You've completed today's standup!" 
              : "Check in daily to maintain your streak and earn rewards"}
          </p>
        </div>

        {/* Status Card */}
        <Card className={cn(
          "overflow-hidden",
          !isCompleted && "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
        )}>
          <CardContent className="p-6 space-y-4">
            {isCompleted ? (
              <div className="text-center space-y-3">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-green-600">Completed!</p>
                  <p className="text-sm text-muted-foreground">
                    +150 XP earned today
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Timer */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      Time Remaining
                    </span>
                    <Badge variant="outline" className="font-mono">
                      {timeRemaining}
                    </Badge>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                </div>

                {/* Rewards Preview */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <p className="text-sm font-medium">Today's Rewards</p>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-1">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <p className="text-xs font-medium">+150 XP</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-primary/20 flex items-center justify-center mb-1">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <p className="text-xs font-medium">10x Boost</p>
                    </div>
                    <div className="text-center">
                      <div className="w-10 h-10 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center mb-1">
                        <Flame className="h-5 w-5 text-orange-500" />
                      </div>
                      <p className="text-xs font-medium">+1 Streak</p>
                    </div>
                  </div>
                </div>

                {/* Complete Button */}
                <Button
                  size="lg"
                  className="w-full"
                  onClick={handleComplete}
                  disabled={isPending || isLoading}
                >
                  {isPending ? (
                    <>
                      <span className="animate-spin mr-2">⏳</span>
                      Completing...
                    </>
                  ) : (
                    <>
                      <Zap className="h-5 w-5 mr-2" />
                      Complete Standup
                    </>
                  )}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Streak Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-500" />
              Streak Calendar
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between mb-4">
              {last7Days.map((day, index) => {
                const hasStreak = streakDays.has(index) || (day.isToday && isCompleted);
                return (
                  <div
                    key={index}
                    className={cn(
                      "flex flex-col items-center gap-1",
                      day.isToday && "font-bold"
                    )}
                  >
                    <span className="text-[10px] text-muted-foreground uppercase">
                      {day.dayName}
                    </span>
                    <div
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-sm",
                        hasStreak && "bg-orange-500 text-white",
                        !hasStreak && day.isToday && "bg-muted border-2 border-primary",
                        !hasStreak && !day.isToday && "bg-muted text-muted-foreground"
                      )}
                    >
                      {hasStreak ? (
                        <Flame className="h-5 w-5" />
                      ) : (
                        day.dayNum
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Current Streak */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Flame className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{currentStreak}</p>
                  <p className="text-xs text-muted-foreground">Day Streak</p>
                </div>
              </div>
              {currentStreak >= 7 && (
                <Badge className="bg-orange-500/20 text-orange-600">
                  <Trophy className="h-3 w-3 mr-1" />
                  On Fire!
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Streak Milestones */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              Streak Milestones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { days: 7, reward: '500 XP + Badge', achieved: currentStreak >= 7 },
                { days: 14, reward: '1,000 XP + Loot Box', achieved: currentStreak >= 14 },
                { days: 30, reward: '2,500 XP + Special Title', achieved: currentStreak >= 30 },
                { days: 100, reward: '10,000 XP + Legendary Status', achieved: currentStreak >= 100 },
              ].map((milestone) => (
                <div
                  key={milestone.days}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border",
                    milestone.achieved && "bg-primary/5 border-primary/30"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      milestone.achieved ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      {milestone.achieved ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <span className="text-sm font-medium">{milestone.days}</span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{milestone.days} Day Streak</p>
                      <p className="text-xs text-muted-foreground">{milestone.reward}</p>
                    </div>
                  </div>
                  {milestone.achieved && (
                    <Badge variant="secondary" className="text-[10px]">
                      <Star className="h-3 w-3 mr-1 text-yellow-500" />
                      Earned
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

      </div>
    </PulseLayout>
  );
}
