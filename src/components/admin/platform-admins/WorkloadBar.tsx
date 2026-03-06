import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface WorkloadBarProps {
  current: number;
  max: number;
  className?: string;
}

export function WorkloadBar({ current, max, className }: WorkloadBarProps) {
  const percentage = max > 0 ? Math.min((current / max) * 100, 100) : 0;

  const colorClass =
    percentage >= 100
      ? 'bg-destructive'
      : percentage >= 70
        ? 'bg-orange-500'
        : 'bg-green-500';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Progress
        value={percentage}
        className="h-2 w-20"
        indicatorClassName={colorClass}
      />
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {current}/{max}
      </span>
    </div>
  );
}
