/**
 * Daily Standup Widget
 * Expanded version of DailyStandupBanner for sidebar
 * Links to dedicated standup page
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Zap, Clock, Sparkles, Flame, TrendingUp, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTodayStandup, useCompleteStandup, useProviderStats } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface DailyStandupWidgetProps {
  providerId: string;
  className?: string;
}

export function DailyStandupWidget({ providerId, className }: DailyStandupWidgetProps) {
  const navigate = useNavigate();
  const { data: todayStandup, isLoading } = useTodayStandup(providerId);
  const { data: stats } = useProviderStats(providerId);
  const { mutate: completeStandup, isPending } = useCompleteStandup();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [progressPercent, setProgressPercent] = useState(100);

  // Calculate time until midnight reset
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const totalDayMs = 24 * 60 * 60 * 1000;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      // Calculate progress (100% at midnight, 0% just before midnight)
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
    completeStandup({ providerId, updatesViewed: 0 });
  };

  if (isLoading) {
    return (
      <Card className={cn("", className)}>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const isCompleted = !!todayStandup?.completed_at;
  const currentStreak = stats?.current_streak || 0;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      !isCompleted && "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className={cn(
              "h-4 w-4",
              isCompleted ? "text-green-500" : "text-primary"
            )} />
            Daily Standup
          </CardTitle>
          {isCompleted ? (
            <Badge className="bg-green-500/20 text-green-600 text-[10px]">
              ✓ Complete
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-[10px] bg-primary/20 text-primary">
              +150 XP
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {!isCompleted && (
          <>
            {/* Timer Progress */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Expires in {timeRemaining}
                </span>
                <span className="text-destructive/70 text-[10px]">Don't miss out!</span>
              </div>
              <Progress value={progressPercent} className="h-1" />
            </div>

            {/* Rewards */}
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
                +150 XP
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1 text-primary" />
                10x Boost
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Flame className="h-3 w-3 mr-1 text-orange-500" />
                Visibility
              </Badge>
            </div>

            {/* Complete Button */}
            <Button
              size="sm"
              className="w-full"
              onClick={handleComplete}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Completing...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Complete Standup
                </>
              )}
            </Button>
          </>
        )}

        {/* Streak Display */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
              <Flame className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium">{currentStreak} Day Streak</p>
              <p className="text-[10px] text-muted-foreground">
                {isCompleted ? 'Keep it going!' : 'Complete to maintain'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => navigate('/pulse/standup')}
          >
            <Calendar className="h-3 w-3 mr-1" />
            View
            <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
