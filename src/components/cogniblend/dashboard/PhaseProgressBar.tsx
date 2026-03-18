/**
 * PhaseProgressBar — 13-segment horizontal bar showing challenge phase progress.
 *
 * Completed phases → green
 * Current phase → blue with pulse animation
 * Future phases → gray
 * Shows "Phase X of 13" text below.
 */

import { cn } from '@/lib/utils';

const TOTAL_PHASES = 13;

interface PhaseProgressBarProps {
  currentPhase: number;
}

export function PhaseProgressBar({ currentPhase }: PhaseProgressBarProps) {
  const phase = Math.max(1, Math.min(currentPhase, TOTAL_PHASES));

  return (
    <div className="space-y-1">
      <div className="flex gap-[2px] h-1">
        {Array.from({ length: TOTAL_PHASES }, (_, i) => {
          const phaseNum = i + 1;
          const isCompleted = phaseNum < phase;
          const isCurrent = phaseNum === phase;

          return (
            <div
              key={phaseNum}
              className={cn(
                'flex-1 rounded-full transition-colors',
                isCompleted && 'bg-[hsl(155,68%,37%)]',
                isCurrent && 'bg-[hsl(210,68%,54%)] animate-pulse',
                !isCompleted && !isCurrent && 'bg-muted',
              )}
            />
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Phase {phase} of {TOTAL_PHASES}
      </p>
    </div>
  );
}
