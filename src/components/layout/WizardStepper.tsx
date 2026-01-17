import { Check, Lock, Clock, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';

export interface WizardStep {
  id: number;
  title: string;
  shortTitle: string;
}

export type OrgApprovalStatus = 'pending' | 'approved' | 'declined' | 'withdrawn' | null;

interface WizardStepperProps {
  steps: WizardStep[];
  currentStep: number;
  completedSteps: number[];
  accessibleSteps?: number[];
  skippedSteps?: number[];
  blockedSteps?: number[];
  lockedSteps?: number[]; // Steps locked due to lifecycle stage
  nextAccessibleStep?: number;
  orgApprovalStatus?: OrgApprovalStatus; // Status for org step badge
  onStepClick?: (stepId: number) => void;
}

export function WizardStepper({ 
  steps, 
  currentStep, 
  completedSteps, 
  accessibleSteps = [],
  skippedSteps = [],
  blockedSteps = [],
  lockedSteps = [],
  nextAccessibleStep,
  orgApprovalStatus,
  onStepClick,
}: WizardStepperProps) {
  // Helper to render approval status badge for org step (step 3)
  const renderApprovalBadge = (stepId: number) => {
    if (stepId !== 3 || !orgApprovalStatus) return null;
    
    const badgeConfig = {
      pending: { 
        variant: 'outline' as const, 
        className: 'bg-amber-50 text-amber-700 border-amber-300 text-[10px] px-1.5 py-0', 
        icon: Clock, 
        label: 'Pending' 
      },
      approved: { 
        variant: 'outline' as const, 
        className: 'bg-green-50 text-green-700 border-green-300 text-[10px] px-1.5 py-0', 
        icon: CheckCircle, 
        label: 'Approved' 
      },
      declined: { 
        variant: 'outline' as const, 
        className: 'bg-red-50 text-red-700 border-red-300 text-[10px] px-1.5 py-0', 
        icon: XCircle, 
        label: 'Declined' 
      },
      withdrawn: { 
        variant: 'outline' as const, 
        className: 'bg-slate-50 text-slate-600 border-slate-300 text-[10px] px-1.5 py-0', 
        icon: null, 
        label: 'Withdrawn' 
      },
    };
    
    const config = badgeConfig[orgApprovalStatus];
    if (!config) return null;
    
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className={cn("gap-0.5 h-4", config.className)}>
        {Icon && <Icon className="h-2.5 w-2.5" />}
        {config.label}
      </Badge>
    );
  };
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
            const isLocked = lockedSteps.includes(step.id); // Lifecycle lock
            const isUpcoming = step.id > currentStep && !isCompleted;
            const isNextAccessible = step.id === nextAccessibleStep && !isCompleted && !isCurrent;
            const isAccessible = accessibleSteps.includes(step.id);
            
            // Locked steps are NOT clickable (frozen by lifecycle)
            // Completed steps are "clickable" - parent handles navigation or popup
            // Current step and next accessible step are clickable
            // Gray (not started, not accessible) steps are NOT clickable
            const isClickable = !isLocked && (isCompleted || isCurrent || isNextAccessible);
            
            // Completed but not accessible (blocked by earlier incomplete step)
            const isCompletedButBlocked = isCompleted && !isAccessible;

            const stepCircle = (
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all relative",
                  // Locked state (lifecycle freeze) - greyed out with lock overlay
                  isLocked && isCompleted && "bg-slate-400 text-white cursor-not-allowed opacity-75",
                  isLocked && !isCompleted && "bg-slate-300 text-slate-500 cursor-not-allowed opacity-75",
                  // Normal states when not locked
                  !isLocked && isCompleted && !isBlocked && !isCompletedButBlocked && "bg-green-500 text-white cursor-pointer hover:bg-green-600 hover:scale-105",
                  !isLocked && isCompleted && isBlocked && "bg-green-500 text-white cursor-pointer ring-2 ring-amber-400",
                  !isLocked && isCompletedButBlocked && !isBlocked && "bg-green-500 text-white cursor-pointer hover:bg-green-500/80",
                  !isLocked && isCurrent && "bg-primary text-primary-foreground ring-2 ring-primary/30",
                  isSkipped && "bg-muted text-muted-foreground border border-dashed",
                  !isLocked && isNextAccessible && "bg-muted text-muted-foreground cursor-pointer hover:bg-muted/80 ring-1 ring-primary/40 hover:ring-primary/60",
                  !isLocked && isUpcoming && !isSkipped && !isNextAccessible && "bg-muted text-muted-foreground"
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
                {/* Lock indicator for lifecycle-locked steps */}
                {isLocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-600 flex items-center justify-center">
                    <Lock className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
                {/* Amber lock for blocked steps (pending approval) */}
                {!isLocked && isBlocked && (
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
                  {isLocked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {stepCircle}
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[200px] text-center">
                        <p className="text-xs">This step is locked and cannot be modified</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : isBlocked ? (
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
                      // Locked state
                      isLocked && "text-slate-400 cursor-not-allowed",
                      // Normal states when not locked
                      !isLocked && isCurrent && "text-primary font-medium",
                      !isLocked && isCompleted && !isBlocked && !isCompletedButBlocked && "text-green-600 cursor-pointer hover:underline",
                      !isLocked && isCompleted && isBlocked && "text-amber-600 cursor-pointer",
                      !isLocked && isCompletedButBlocked && !isBlocked && "text-green-600 cursor-pointer",
                      !isLocked && isNextAccessible && "text-primary/70 cursor-pointer hover:text-primary hover:underline",
                      !isLocked && isUpcoming && !isSkipped && !isNextAccessible && "text-muted-foreground",
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
                  {/* Approval status badge for org step */}
                  {renderApprovalBadge(step.id)}
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
            const isLocked = lockedSteps.includes(step.id);
            const isNextAccessible = step.id === nextAccessibleStep && !isCompleted && !isCurrent;
            // Locked steps are NOT clickable
            // Completed steps are clickable (will show popup if blocked), plus current and next accessible
            const isClickable = !isLocked && (isCompleted || isCurrent || isNextAccessible);

              return (
                <div
                  key={step.id}
                  className={cn(
                    "w-2.5 h-2.5 rounded-full transition-all relative",
                    // Locked state
                    isLocked && "bg-slate-400 cursor-not-allowed opacity-75",
                    // Normal states when not locked
                    !isLocked && isCompleted && !isBlocked && "bg-green-500 cursor-pointer hover:scale-125",
                    !isLocked && isCompleted && isBlocked && "bg-green-500 ring-1 ring-amber-400 cursor-pointer",
                    !isLocked && isCurrent && "bg-primary w-6",
                    isSkipped && "bg-muted border border-dashed",
                    !isLocked && isNextAccessible && "bg-muted ring-1 ring-primary/50 cursor-pointer hover:scale-125",
                    !isLocked && !isCompleted && !isCurrent && !isSkipped && !isNextAccessible && "bg-muted"
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
