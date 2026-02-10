/**
 * StepIndicator Component
 * 
 * Visual stepper showing registration progress across 5 steps.
 * States: completed (checkmark), active (highlighted), pending (muted).
 */

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { REGISTRATION_STEPS } from '@/types/registration';

interface StepIndicatorProps {
  currentStep: number;
  completedSteps?: number[];
}

export function StepIndicator({ currentStep, completedSteps = [] }: StepIndicatorProps) {
  return (
    <nav aria-label="Registration progress" className="w-full">
      <ol className="flex items-center w-full">
        {REGISTRATION_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(step.number) || step.number < currentStep;
          const isActive = step.number === currentStep;
          const isLast = index === REGISTRATION_STEPS.length - 1;

          return (
            <li
              key={step.number}
              className={cn('flex items-center', !isLast && 'flex-1')}
            >
              {/* Step circle */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors shrink-0',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isActive && 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2 ring-offset-background',
                    !isCompleted && !isActive && 'bg-muted text-muted-foreground',
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    'text-xs font-medium whitespace-nowrap hidden lg:block',
                    isActive && 'text-primary',
                    isCompleted && 'text-primary',
                    !isCompleted && !isActive && 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'h-0.5 w-full mx-2 transition-colors',
                    isCompleted ? 'bg-primary' : 'bg-border',
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
