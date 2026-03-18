/**
 * SolutionStatusBadge — Displays a colored badge for a solution's current state.
 *
 * Derives the display status from current_phase, phase_status, and selection_status,
 * then renders with the appropriate color from SOLUTION_STATUS_META.
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  deriveSolutionDisplayStatus,
  SOLUTION_STATUS_META,
  type SolutionDisplayStatus,
} from '@/constants/solutionStatus.constants';

interface SolutionStatusBadgeProps {
  currentPhase: number | null;
  phaseStatus: string | null;
  selectionStatus?: string | null;
  /** Override derived status with an explicit value */
  overrideStatus?: SolutionDisplayStatus;
  className?: string;
}

const SolutionStatusBadge = React.memo(
  React.forwardRef<HTMLDivElement, SolutionStatusBadgeProps>(
    ({ currentPhase, phaseStatus, selectionStatus, overrideStatus, className }, ref) => {
      const status =
        overrideStatus ?? deriveSolutionDisplayStatus(currentPhase, phaseStatus, selectionStatus ?? null);
      const meta = SOLUTION_STATUS_META[status];

      return (
        <Badge
          ref={ref}
          variant="secondary"
          className={cn(
            'text-[11px] font-semibold',
            meta.colorClass,
            meta.strikethrough && 'line-through',
            className,
          )}
        >
          {meta.label}
        </Badge>
      );
    },
  ),
);
SolutionStatusBadge.displayName = 'SolutionStatusBadge';

export { SolutionStatusBadge };
