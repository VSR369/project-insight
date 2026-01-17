import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssessmentTimerProps {
  startedAt: string;
  timeLimitMinutes: number;
  onTimeExpired: () => void;
  className?: string;
}

export function AssessmentTimer({
  startedAt,
  timeLimitMinutes,
  onTimeExpired,
  className,
}: AssessmentTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);
  const [hasExpired, setHasExpired] = useState(false);

  const calculateRemainingTime = useCallback(() => {
    const startTime = new Date(startedAt).getTime();
    const endTime = startTime + timeLimitMinutes * 60 * 1000;
    const now = Date.now();
    const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
    return remaining;
  }, [startedAt, timeLimitMinutes]);

  useEffect(() => {
    // Initial calculation
    setRemainingSeconds(calculateRemainingTime());

    // Update every second
    const interval = setInterval(() => {
      const remaining = calculateRemainingTime();
      setRemainingSeconds(remaining);

      if (remaining <= 0 && !hasExpired) {
        setHasExpired(true);
        onTimeExpired();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateRemainingTime, hasExpired, onTimeExpired]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerState = () => {
    const minutes = remainingSeconds / 60;
    if (minutes <= 5) return 'critical';
    if (minutes <= 10) return 'warning';
    return 'normal';
  };

  const timerState = getTimerState();

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-semibold transition-colors duration-300',
        {
          'bg-muted text-muted-foreground': timerState === 'normal',
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': timerState === 'warning',
          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 animate-pulse': timerState === 'critical',
        },
        className
      )}
    >
      {timerState === 'critical' ? (
        <AlertTriangle className="h-5 w-5" />
      ) : (
        <Clock className="h-5 w-5" />
      )}
      <span>{formatTime(remainingSeconds)}</span>
    </div>
  );
}
