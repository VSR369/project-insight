import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface WorkloadBarProps {
  current: number;
  max: number;
  className?: string;
}

export const WorkloadBar = forwardRef<HTMLDivElement, WorkloadBarProps>(
  function WorkloadBar({ current, max, className }, ref) {
    const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

    const barColor =
      percentage >= 100
        ? 'bg-destructive'
        : percentage >= 70
          ? 'bg-orange-500'
          : 'bg-green-500';

    return (
      <div ref={ref} className={cn('flex items-center gap-2', className)}>
        <div className="relative h-2 w-20 overflow-hidden rounded-full bg-secondary">
          <div
            className={cn('h-full transition-all', barColor)}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {current}/{max}
        </span>
      </div>
    );
  }
);
