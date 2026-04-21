/**
 * LcLegalStepIndicator — Visual 3-step progress for the LC legal workspace.
 * Steps: 1. Upload sources → 2. Review & Edit unified agreement → 3. Approved.
 */
import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LcLegalStepIndicatorProps {
  /** Active step (1, 2, or 3). */
  currentStep: 1 | 2 | 3;
}

const STEPS: { number: 1 | 2 | 3; label: string }[] = [
  { number: 1, label: 'Upload Sources' },
  { number: 2, label: 'Review & Edit' },
  { number: 3, label: 'Approved' },
];

export function LcLegalStepIndicator({ currentStep }: LcLegalStepIndicatorProps) {
  return (
    <nav aria-label="Legal review progress" className="w-full">
      <ol className="flex items-center gap-2 lg:gap-3">
        {STEPS.map((step, idx) => {
          const isCompleted = step.number < currentStep;
          const isActive = step.number === currentStep;
          const isLast = idx === STEPS.length - 1;
          return (
            <li key={step.number} className="flex items-center gap-2 lg:gap-3">
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground',
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? <Check className="h-3.5 w-3.5" /> : step.number}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium hidden lg:inline',
                    (isCompleted || isActive) ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export default LcLegalStepIndicator;
