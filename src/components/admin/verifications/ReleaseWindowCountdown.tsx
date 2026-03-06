import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface ReleaseWindowCountdownProps {
  assignedAt: string;
  windowHours?: number;
  className?: string;
}

/**
 * Countdown timer showing remaining time in the release window.
 * Hides after window expires.
 */
export function ReleaseWindowCountdown({
  assignedAt,
  windowHours = 2,
  className,
}: ReleaseWindowCountdownProps) {
  const [remaining, setRemaining] = useState('');
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const deadline = new Date(assignedAt).getTime() + windowHours * 3600 * 1000;

    const tick = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setRemaining('Expired');
        return;
      }
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setRemaining(`${hrs}h ${mins}m ${secs}s`);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [assignedAt, windowHours]);

  if (expired) return null;

  return (
    <span className={cn('text-xs text-muted-foreground', className)}>
      Release window: {remaining}
    </span>
  );
}
