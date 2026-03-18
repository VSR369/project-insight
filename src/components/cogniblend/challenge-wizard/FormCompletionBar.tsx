/**
 * FormCompletionBar — Thin horizontal bar showing overall form completion %.
 * Colors: red <50%, amber 50–80%, green >80%.
 */

import { cn } from '@/lib/utils';

interface FormCompletionBarProps {
  filledCount: number;
  totalCount: number;
}

export function FormCompletionBar({ filledCount, totalCount }: FormCompletionBarProps) {
  const pct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

  const barColor =
    pct > 80
      ? 'bg-[#1D9E75]'
      : pct >= 50
        ? 'bg-amber-500'
        : 'bg-destructive';

  const textColor =
    pct > 80
      ? 'text-[#1D9E75]'
      : pct >= 50
        ? 'text-amber-600'
        : 'text-destructive';

  return (
    <div className="w-full px-1 mb-4">
      <div className="flex items-center justify-between mb-1">
        <span className={cn('text-xs font-medium', textColor)}>
          Form Completion: {pct}%
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {filledCount} / {totalCount} fields
        </span>
      </div>
      <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-300', barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
