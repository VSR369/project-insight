import { Check, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  blockedSteps?: number[];
  onStepClick?: (stepId: number) => void;
}

export function WizardStepper({ 
  steps, 
  currentStep, 
  completedSteps, 
  skippedSteps = [],
  blockedSteps = [],
  onStepClick,
}: WizardStepperProps) {
  return (
    <TooltipProvider>
      <div className="w-full px-4 py-3">
        {/* Desktop view - horizontal stepper */}
        <div className="hidden md:flex items-center justify-center gap-1">
          {steps.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isSkipped = skippedSteps.includes(step.id);
            const isBlocked = blockedSteps.includes(step.id);
            const isUpcoming = step.id > currentStep && !isCompleted;

            const stepCircle = (
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all relative",
                  isCompleted && !isBlocked && "bg-green-500 text-white cursor-pointer hover:bg-green-600 hover:scale-105",
                  isCompleted && isBlocked && "bg-green-500 text-white cursor-pointer ring-2 ring-amber-400",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isSkipped && "bg-muted text-muted-foreground border border-dashed",
                  isUpcoming && !isSkipped && "bg-muted text-muted-foreground"
                )}
                onClick={() => {
                  if (isCompleted && onStepClick) {
                    onStepClick(step.id);
                  }
                }}
                role={isCompleted ? "button" : undefined}
                tabIndex={isCompleted ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isCompleted && onStepClick && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault();
                    onStepClick(step.id);
                  }
                }}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  step.id
                )}
                {/* Lock indicator for blocked steps */}
                {isBlocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                    <Lock className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
            );

            return (
              <div key={step.id} className="flex items-center">
                {/* Step circle */}
                <div className="flex flex-col items-center">
                  {isBlocked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {stepCircle}
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-center">
                        <p className="text-xs">Cannot change mode while manager approval is pending</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    stepCircle
                  )}
                  <span 
                    className={cn(
                      "text-xs mt-1 max-w-[60px] text-center truncate transition-all",
                      isCurrent && "text-primary font-medium",
                      isCompleted && !isBlocked && "text-green-600 cursor-pointer hover:underline",
                      isCompleted && isBlocked && "text-amber-600 cursor-pointer",
                      (isUpcoming || isSkipped) && "text-muted-foreground"
                    )}
                    onClick={() => {
                      if (isCompleted && onStepClick) {
                        onStepClick(step.id);
                      }
                    }}
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
              const isBlocked = blockedSteps.includes(step.id);

              return (
                <div
                  key={step.id}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all relative",
                    isCompleted && !isBlocked && "bg-green-500 cursor-pointer hover:scale-125",
                    isCompleted && isBlocked && "bg-green-500 ring-1 ring-amber-400 cursor-pointer",
                    isCurrent && "bg-primary w-6",
                    isSkipped && "bg-muted border border-dashed",
                    !isCompleted && !isCurrent && !isSkipped && "bg-muted"
                  )}
                  onClick={() => {
                    if (isCompleted && onStepClick) {
                      onStepClick(step.id);
                    }
                  }}
                  role={isCompleted ? "button" : undefined}
                  tabIndex={isCompleted ? 0 : undefined}
                />
              );
            })}
          </div>
          <span className="text-sm text-muted-foreground">
            Step {currentStep} of {steps.length}: {steps.find(s => s.id === currentStep)?.title}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
