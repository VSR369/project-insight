/**
 * SlaCountdown — Real-time SLA countdown timer.
 * Displays "Xd Xh remaining" or "BREACHED — Xd Xh overdue".
 * Updates every 60 seconds via setInterval.
 *
 * Color coding:
 *   > 3 days  → green
 *   1–3 days  → amber
 *   < 1 day   → red
 *   breached  → flashing red
 */

import { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface SlaCountdownProps {
  /** ISO timestamp of the SLA deadline */
  deadlineAt: string | null;
  /** ISO timestamp when the timer started (for percentage calculation) */
  startedAt?: string | null;
}

interface TimeLeft {
  totalMs: number;
  days: number;
  hours: number;
}

function computeTimeLeft(deadlineAt: string): TimeLeft {
  const diffMs = new Date(deadlineAt).getTime() - Date.now();
  const absDiffMs = Math.abs(diffMs);
  const days = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((absDiffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  return { totalMs: diffMs, days, hours };
}

export function SlaCountdown({ deadlineAt, startedAt }: SlaCountdownProps) {
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now), 60_000);
    return () => clearInterval(interval);
  }, []);

  const time = useMemo(() => {
    if (!deadlineAt) return null;
    // force recalc when `now` changes
    void now;
    return computeTimeLeft(deadlineAt);
  }, [deadlineAt, now]);

  if (!time) return null;

  const isBreached = time.totalMs <= 0;
  const totalDays = time.days + time.hours / 24;

  // Color classes
  let colorClass: string;
  if (isBreached) {
    colorClass = 'text-[hsl(1,71%,52%)] font-bold';
  } else if (totalDays < 1) {
    colorClass = 'text-[hsl(1,71%,52%)] font-semibold';
  } else if (totalDays <= 3) {
    colorClass = 'text-[hsl(38,68%,41%)] font-semibold';
  } else {
    colorClass = 'text-[hsl(155,68%,30%)] font-medium';
  }

  const label = isBreached
    ? `BREACHED — ${time.days}d ${time.hours}h overdue`
    : `${time.days}d ${time.hours}h remaining`;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] lg:text-xs',
        colorClass,
        isBreached && 'animate-pulse',
      )}
    >
      <span
        className={cn(
          'inline-block h-2 w-2 rounded-full shrink-0',
          isBreached
            ? 'bg-[hsl(1,71%,52%)] animate-pulse'
            : totalDays < 1
              ? 'bg-[hsl(1,71%,52%)]'
              : totalDays <= 3
                ? 'bg-[hsl(38,68%,41%)]'
                : 'bg-[hsl(155,68%,37%)]',
        )}
      />
      {label}
    </span>
  );
}
