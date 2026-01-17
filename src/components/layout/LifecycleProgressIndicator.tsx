import { useMemo } from 'react';
import { ChevronRight, Target, Flag } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { LIFECYCLE_RANKS, getStatusDisplayName } from '@/services/lifecycleService';

interface LifecycleProgressIndicatorProps {
  currentStatus: string;
  currentRank: number;
  className?: string;
}

// Define milestone stages for display
const MILESTONES = [
  { status: 'registered', rank: 15, label: 'Registered', shortLabel: 'Reg' },
  { status: 'expertise_selected', rank: 50, label: 'Expertise Selected', shortLabel: 'Exp' },
  { status: 'proof_points_min_met', rank: 70, label: 'Proof Points Complete', shortLabel: 'Proof' },
  { status: 'assessment_passed', rank: 110, label: 'Assessment Passed', shortLabel: 'Assess' },
  { status: 'verified', rank: 140, label: 'Verified', shortLabel: 'Verified' },
];

export function LifecycleProgressIndicator({
  currentStatus,
  currentRank,
  className,
}: LifecycleProgressIndicatorProps) {
  // Calculate progress percentage based on milestones
  const { progressPercent, currentMilestone, nextMilestone } = useMemo(() => {
    const maxRank = LIFECYCLE_RANKS.verified; // 140 is our target
    const percent = Math.min((currentRank / maxRank) * 100, 100);
    
    // Find current and next milestones
    let current = MILESTONES[0];
    let next: typeof MILESTONES[0] | null = null;
    
    for (let i = 0; i < MILESTONES.length; i++) {
      if (currentRank >= MILESTONES[i].rank) {
        current = MILESTONES[i];
        next = MILESTONES[i + 1] || null;
      } else {
        next = MILESTONES[i];
        break;
      }
    }
    
    return {
      progressPercent: percent,
      currentMilestone: current,
      nextMilestone: next,
    };
  }, [currentRank]);

  // Terminal states don't show progress
  const isTerminal = currentRank >= LIFECYCLE_RANKS.verified;
  const displayStatus = getStatusDisplayName(currentStatus);

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-3", className)}>
        {/* Current status badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant="outline" 
              className={cn(
                "gap-1.5 px-2 py-0.5 text-xs font-medium cursor-help",
                isTerminal 
                  ? "bg-green-50 text-green-700 border-green-300" 
                  : "bg-primary/5 text-primary border-primary/20"
              )}
            >
              <Target className="h-3 w-3" />
              {displayStatus}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">Current lifecycle stage</p>
          </TooltipContent>
        </Tooltip>

        {/* Progress bar (only show if not terminal) */}
        {!isTerminal && (
          <>
            <div className="hidden sm:flex items-center gap-2 min-w-[120px]">
              <Progress 
                value={progressPercent} 
                className="h-1.5 w-full bg-muted" 
              />
              <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                {Math.round(progressPercent)}%
              </span>
            </div>

            {/* Next milestone */}
            {nextMilestone && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:flex items-center gap-1.5 text-xs text-muted-foreground cursor-help">
                    <ChevronRight className="h-3 w-3" />
                    <Flag className="h-3 w-3 text-primary/60" />
                    <span className="font-medium">{nextMilestone.shortLabel}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Next milestone: {nextMilestone.label}</p>
                </TooltipContent>
              </Tooltip>
            )}
          </>
        )}

        {/* Verified badge for terminal state */}
        {isTerminal && (
          <Badge 
            variant="outline" 
            className="gap-1 bg-green-50 text-green-700 border-green-300 text-xs"
          >
            <Flag className="h-3 w-3" />
            Complete
          </Badge>
        )}
      </div>
    </TooltipProvider>
  );
}
