/**
 * Daily Standup Banner Component
 * Shows countdown timer, XP reward, visibility boost badges
 * Dismissible when completed
 */

import { useState, useEffect } from 'react';
import { Zap, Clock, Sparkles, X, Flame, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useTodayStandup, useCompleteStandup } from '@/hooks/queries/usePulseStats';
import { cn } from '@/lib/utils';

interface DailyStandupBannerProps {
  providerId: string;
  className?: string;
}

export function DailyStandupBanner({ providerId, className }: DailyStandupBannerProps) {
  const { data: todayStandup, isLoading } = useTodayStandup(providerId);
  const { mutate: completeStandup, isPending } = useCompleteStandup();
  const [timeRemaining, setTimeRemaining] = useState<string>('');
  const [dismissed, setDismissed] = useState(false);

  // Calculate time until midnight reset
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m`);
      } else {
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, []);

  // Don't show if loading, already completed, or dismissed
  if (isLoading || todayStandup?.completed_at || dismissed) {
    return null;
  }

  const handleComplete = () => {
    completeStandup({ providerId, updatesViewed: 0 });
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent",
        className
      )}
      role="alert"
      aria-label="Daily standup notification"
    >
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss standup notification"
      >
        <X className="h-4 w-4" />
      </Button>

      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon with pulse animation */}
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
              <Zap className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary"></span>
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-sm">Daily Standup</h3>
              <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                <Sparkles className="h-3 w-3 mr-1" aria-hidden="true" />
                10x Boost
              </Badge>
            </div>

            {/* Reward badges */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1 text-green-500" aria-hidden="true" />
                +150 XP
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Flame className="h-3 w-3 mr-1 text-orange-500" aria-hidden="true" />
                Visibility Boost
              </Badge>
            </div>

            {/* Timer and warning */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>Expires in {timeRemaining}</span>
              <span className="text-destructive/70">• Don't lose your boost!</span>
            </div>

            {/* Action button */}
            <Button
              size="sm"
              className="w-full sm:w-auto"
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
                  <Zap className="h-4 w-4 mr-2" aria-hidden="true" />
                  Complete Standup
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
