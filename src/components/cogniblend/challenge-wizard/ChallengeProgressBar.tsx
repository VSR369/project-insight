/**
 * ChallengeProgressBar — Horizontal 8-step progress indicator
 * for the Challenge Creation wizard.
 *
 * States: Active (blue), Completed (green + checkmark), Future (gray border)
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { number: 0, label: 'Mode & Model' },
  { number: 1, label: 'Challenge Brief' },
  { number: 2, label: 'Evaluation Criteria' },
  { number: 3, label: 'Rewards & Payment' },
  { number: 4, label: 'Timeline & Phases' },
  { number: 5, label: 'Provider Eligibility' },
  { number: 6, label: 'Templates' },
  { number: 7, label: 'Review & Submit' },
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
    <div className="w-full py-4 px-2">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
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
                    'w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors',
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
                    <Check className="h-3 w-3" strokeWidth={3} />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    'text-[9px] mt-1 whitespace-nowrap font-medium',
                    isCompleted && 'text-[#1D9E75]',
                    isActive && 'text-[#378ADD]',
                    isFuture && 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
                {stepFieldCounts && stepFieldCounts[index] && (
                  <span className="text-[8px] text-muted-foreground tabular-nums whitespace-nowrap mt-0.5">
                    {stepFieldCounts[index].filled}/{stepFieldCounts[index].total}
                  </span>
                )}
              </div>

              {/* Connecting line */}
              {index < STEPS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-1"
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
