/**
 * ProgressStepper — 5-step horizontal indicator for curation progress.
 * Maps curation status to active step with pulse animation.
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CurationProgress } from '@/hooks/cogniblend/useCurationProgress';

const STEPS = [
  { label: 'Submitted', key: 'submitted' },
  { label: 'Research', key: 'context_research' },
  { label: 'AI Review', key: 'ai_review' },
  { label: 'Curator Editing', key: 'curator_editing' },
  { label: 'Ready', key: 'ready' },
] as const;

function getActiveIndex(status: CurationProgress['status'] | undefined): number {
  switch (status) {
    case 'waiting': return 0;
    case 'context_research': return 1;
    case 'ai_review': return 2;
    case 'curator_editing': return 3;
    case 'sent_for_approval':
    case 'completed': return 4;
    default: return 0;
  }
}

interface ProgressStepperProps {
  status: CurationProgress['status'] | undefined;
}

export function ProgressStepper({ status }: ProgressStepperProps) {
  const activeIndex = getActiveIndex(status);

  return (
    <div className="flex items-center w-full gap-0">
      {STEPS.map((step, i) => {
        const isCompleted = i < activeIndex;
        const isActive = i === activeIndex;
        const isPending = i > activeIndex;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={cn(
                  'flex items-center justify-center h-8 w-8 rounded-full border-2 text-xs font-semibold transition-all',
                  isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                  isActive && 'border-primary bg-primary/10 text-primary animate-pulse',
                  isPending && 'border-muted-foreground/30 bg-muted text-muted-foreground/50',
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={cn(
                  'text-[10px] font-medium text-center leading-tight whitespace-nowrap',
                  isCompleted && 'text-emerald-600',
                  isActive && 'text-primary font-semibold',
                  isPending && 'text-muted-foreground/50',
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 mt-[-18px]',
                  i < activeIndex ? 'bg-emerald-500' : 'bg-muted-foreground/20',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
