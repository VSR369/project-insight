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
  accessibleSteps?: number[];
  skippedSteps?: number[];
  blockedSteps?: number[];
  nextAccessibleStep?: number;
  onStepClick?: (stepId: number) => void;
}

export function WizardStepper({ 
  steps, 
  currentStep, 
  completedSteps, 
  accessibleSteps = [],
  skippedSteps = [],
  blockedSteps = [],
  nextAccessibleStep,
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
            const isNextAccessible = step.id === nextAccessibleStep && !isCompleted && !isCurrent;
            const isAccessible = accessibleSteps.includes(step.id);
            
            // Completed steps are always "clickable" - parent handles whether to navigate or show popup
            // Current step and next accessible step are clickable
            // Gray (not started, not accessible) steps are NOT clickable
            const isClickable = isCompleted || isCurrent || isNextAccessible;
            
            // Completed but not accessible (blocked by earlier incomplete step)
            const isCompletedButBlocked = isCompleted && !isAccessible;

            const stepCircle = (
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all relative",
                  isCompleted && !isBlocked && !isCompletedButBlocked && "bg-green-500 text-white cursor-pointer hover:bg-green-600 hover:scale-105",
                  isCompleted && isBlocked && "bg-green-500 text-white cursor-pointer ring-2 ring-amber-400",
                  isCompletedButBlocked && !isBlocked && "bg-green-500 text-white cursor-pointer hover:bg-green-500/80",
                  isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isSkipped && "bg-muted text-muted-foreground border border-dashed",
                  isNextAccessible && "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 ring-1 ring-primary/40 hover:ring-primary/60",
                  isUpcoming && !isSkipped && !isNextAccessible && "bg-muted text-muted-foreground"
                )}
                onClick={() => {
                  if (isClickable && onStepClick) {
                    onStepClick(step.id);
                  }
                }}
                role={isClickable ? "button" : undefined}
                tabIndex={isClickable ? 0 : undefined}
                onKeyDown={(e) => {
                  if (isClickable && onStepClick && (e.key === 'Enter' || e.key === ' ')) {
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
                  ) : isCompletedButBlocked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {stepCircle}
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-center">
                        <p className="text-xs">Complete previous step first</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    stepCircle
                  )}
                  <span 
                    className={cn(
                      "text-xs mt-1 max-w-[60px] text-center truncate transition-all",
                      isCurrent && "text-primary font-medium",
                      isCompleted && !isBlocked && !isCompletedButBlocked && "text-green-600 cursor-pointer hover:underline",
                      isCompleted && isBlocked && "text-amber-600 cursor-pointer",
                      isCompletedButBlocked && !isBlocked && "text-green-600 cursor-pointer",
                      isNextAccessible && "text-primary/70 cursor-pointer hover:text-primary hover:underline",
                      isUpcoming && !isSkipped && !isNextAccessible && "text-muted-foreground",
                      isSkipped && "text-muted-foreground"
                    )}
                    onClick={() => {
                      if (isClickable && onStepClick) {
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
            const isNextAccessible = step.id === nextAccessibleStep && !isCompleted && !isCurrent;
            // Completed steps are clickable (will show popup if blocked), plus current and next accessible
            const isClickable = isCompleted || isCurrent || isNextAccessible;

              return (
                <div
                  key={step.id}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all relative",
                    isCompleted && !isBlocked && "bg-green-500 cursor-pointer hover:scale-125",
                    isCompleted && isBlocked && "bg-green-500 ring-1 ring-amber-400 cursor-pointer",
                    isCurrent && "bg-primary w-6",
                    isSkipped && "bg-muted border border-dashed",
                    isNextAccessible && "bg-muted ring-1 ring-primary/50 cursor-pointer hover:scale-125",
                    !isCompleted && !isCurrent && !isSkipped && !isNextAccessible && "bg-muted"
                  )}
                  onClick={() => {
                    if (isClickable && onStepClick) {
                      onStepClick(step.id);
                    }
                  }}
                  role={isClickable ? "button" : undefined}
                  tabIndex={isClickable ? 0 : undefined}
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
