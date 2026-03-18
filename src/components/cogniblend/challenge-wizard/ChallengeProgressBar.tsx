/**
 * ChallengeProgressBar — Horizontal 4-step progress indicator
 * for the Challenge Creation wizard.
 *
 * States: Active (blue), Completed (green + checkmark), Future (gray border)
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { number: 1, label: 'Problem' },
  { number: 2, label: 'Requirements' },
  { number: 3, label: 'Evaluation' },
  { number: 4, label: 'Timeline' },
] as const;

interface StepFieldCount {
  filled: number;
  total: number;
}

interface ChallengeProgressBarProps {
  currentStep: number;
  completedSteps: number[];
  stepFieldCounts?: StepFieldCount[];
}

export function ChallengeProgressBar({
  currentStep,
  completedSteps,
  stepFieldCounts,
}: ChallengeProgressBarProps) {
  return (
    <div className="w-full py-6 px-4">
      <div className="flex items-center justify-between max-w-xl mx-auto">
        {STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number);
          const isActive = currentStep === step.number;
          const isFuture = !isCompleted && !isActive;

          return (
            <div key={step.number} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center relative">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                    isCompleted && 'text-white',
                    isActive && 'text-white',
                    isFuture && 'border-2 text-muted-foreground'
                  )}
                  style={{
                    backgroundColor: isCompleted
                      ? '#1D9E75'
                      : isActive
                        ? '#378ADD'
                        : 'transparent',
                    borderColor: isFuture ? '#D1D5DB' : undefined,
                  }}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs mt-1.5 whitespace-nowrap font-medium',
                    isCompleted && 'text-[#1D9E75]',
                    isActive && 'text-[#378ADD]',
                    isFuture && 'text-muted-foreground'
                  )}
                >
                  Step {step.number}
                </span>
                <span
                  className={cn(
                    'text-[11px] whitespace-nowrap',
                    isCompleted
                      ? 'text-[#1D9E75]'
                      : isActive
                        ? 'text-[#378ADD]'
                        : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2 mt-[-24px]"
                  style={{
                    backgroundColor: isCompleted ? '#1D9E75' : '#D1D5DB',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
