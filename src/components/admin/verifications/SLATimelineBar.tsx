import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useMpaConfig } from '@/hooks/queries/useMpaConfig';

interface SLATimelineBarProps {
  slaStartAt: string;
  slaPausedHours: number;
  slaDurationSeconds: number;
  breachTier: string;
  className?: string;
}

/**
 * SLA Timeline progress bar with color-coded zones.
 * Green (0-80%) → Amber (80-99%) → Red (100-149%) → Dark-red (150%+)
 */
export function SLATimelineBar({
  slaStartAt,
  slaPausedHours,
  slaDurationSeconds,
  breachTier,
  className,
}: SLATimelineBarProps) {
  const { data: configs } = useMpaConfig();

  const tier1Pct = useMemo(() => {
    const val = configs?.find(c => c.param_key === 'sla_tier1_pct')?.param_value;
    return val ? parseFloat(val) : 80;
  }, [configs]);

  const { elapsedPct, remainingText, deadlineText } = useMemo(() => {
    if (!slaStartAt) return { elapsedPct: 0, remainingText: '--', deadlineText: '--' };

    const startMs = new Date(slaStartAt).getTime();
    const pausedMs = (slaPausedHours ?? 0) * 3600 * 1000;
    const elapsedMs = Date.now() - startMs - pausedMs;
    const totalMs = slaDurationSeconds * 1000;
    const pct = Math.max(0, (elapsedMs / totalMs) * 100);

    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const remainingHrs = Math.floor(remainingMs / 3600000);
    const remainingMins = Math.floor((remainingMs % 3600000) / 60000);

    const deadline = new Date(startMs + pausedMs + totalMs);
    const deadlineFmt = deadline.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    return {
      elapsedPct: pct,
      remainingText: pct >= 100
        ? `Overdue by ${Math.abs(remainingHrs)}h ${remainingMins}m`
        : `${remainingHrs}h ${remainingMins}m remaining`,
      deadlineText: deadlineFmt,
    };
  }, [slaStartAt, slaPausedHours, slaDurationSeconds]);

  const barColor = useMemo(() => {
    if (elapsedPct >= 150) return 'bg-red-900';
    if (elapsedPct >= 100) return 'bg-destructive';
    if (elapsedPct >= tier1Pct) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [elapsedPct, tier1Pct]);

  const cappedPct = Math.min(elapsedPct, 100);

  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{remainingText}</span>
        <span>Deadline: {deadlineText}</span>
      </div>
      <div className="relative h-2.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-500', barColor)}
          style={{ width: `${cappedPct}%` }}
        />
        {/* Tier threshold markers */}
        <div
          className="absolute top-0 h-full w-px bg-amber-600/60"
          style={{ left: `${tier1Pct}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>0%</span>
        <span>{Math.round(elapsedPct)}% elapsed</span>
        <span>100%</span>
      </div>
    </div>
  );
}
