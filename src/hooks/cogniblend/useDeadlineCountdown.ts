import { useEffect, useState } from 'react';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function useDeadlineCountdown(deadline: string | null): string {
  const [remaining, setRemaining] = useState('No deadline set');

  useEffect(() => {
    if (!deadline) {
      setRemaining('No deadline set');
      return;
    }
    const tick = () => {
      const difference = new Date(deadline).getTime() - Date.now();
      if (difference <= 0) {
        setRemaining('Deadline passed');
        return;
      }
      const days = Math.floor(difference / DAY_MS);
      const hours = Math.floor((difference % DAY_MS) / HOUR_MS);
      const minutes = Math.floor((difference % HOUR_MS) / MINUTE_MS);
      setRemaining(`${days}d ${hours}h ${minutes}m remaining`);
    };
    tick();
    const interval = setInterval(tick, MINUTE_MS);
    return () => clearInterval(interval);
  }, [deadline]);

  return remaining;
}
