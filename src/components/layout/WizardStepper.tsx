import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WizardStep {
  id: number;
  title: string;
  shortTitle: string;
}

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
  skippedSteps?: number[];
}

export function WizardStepper({ 
  steps, 
  currentStep, 
  completedSteps, 
  skippedSteps = [] 
}: WizardStepperProps) {
  return (
    <div className="w-full px-4 py-3">
      {/* Desktop view - horizontal stepper */}
      <div className="hidden md:flex items-center justify-center gap-1">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          const isSkipped = skippedSteps.includes(step.id);
          const isUpcoming = step.id > currentStep && !isCompleted;

          return (
            <div key={step.id} className="flex items-center">
              {/* Step circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors",
                    isCompleted && "bg-green-500 text-white",
                    isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                    isSkipped && "bg-muted text-muted-foreground border border-dashed",
                    isUpcoming && !isSkipped && "bg-muted text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    step.id
                  )}
                </div>
                <span 
                  className={cn(
                    "text-xs mt-1 max-w-[60px] text-center truncate",
                    isCurrent && "text-primary font-medium",
                    isCompleted && "text-green-600",
                    (isUpcoming || isSkipped) && "text-muted-foreground"
                  )}
                >
                  {step.shortTitle}
                </span>
              </div>

              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "w-8 lg:w-12 h-0.5 mx-1 mt-[-16px]",
                    completedSteps.includes(step.id) ? "bg-green-500" : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Mobile view - compact stepper */}
      <div className="md:hidden flex flex-col items-center gap-2">
        <div className="flex items-center gap-1">
          {steps.map((step) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isSkipped = skippedSteps.includes(step.id);

            return (
              <div
                key={step.id}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-colors",
                  isCompleted && "bg-green-500",
                  isCurrent && "bg-primary w-6",
                  isSkipped && "bg-muted border border-dashed",
                  !isCompleted && !isCurrent && !isSkipped && "bg-muted"
                )}
              />
            );
          })}
        </div>
        <span className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length}: {steps.find(s => s.id === currentStep)?.title}
        </span>
      </div>
    </div>
  );
}
