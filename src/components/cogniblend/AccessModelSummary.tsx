/**
 * AccessModelSummary — Simplified 2-tier access model display.
 *
 * Shows:
 *   - Eligible Solvers: Can view AND submit solutions
 *   - Visible Solvers: Can only view/discover the challenge
 */

import { Eye, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AccessModelSummaryProps {
  visibility: string;
  /** Labels for eligible solver types (from selected solver tiers) */
  eligibleSolverLabels?: string[];
  className?: string;
}

const VIS_LABELS: Record<string, string> = {
  public: 'Public — Everyone',
  registered_users: 'Registered Users',
  platform_members: 'Platform Members',
  curated_experts: 'Curated Experts',
  invited_only: 'Invited Only',
};

export function AccessModelSummary({ visibility, eligibleSolverLabels = [], className }: AccessModelSummaryProps) {
  const visLabel = VIS_LABELS[visibility] || visibility;

  return (
    <div className={cn(
      'rounded-lg border border-border bg-card p-4 space-y-3',
      className,
    )}>
      <p className="text-sm font-bold text-foreground">Access Model Summary</p>
      <div className="flex flex-col gap-2 text-[13px]">
        <div className="flex items-start gap-2">
          <Users className="h-4 w-4 mt-0.5 text-primary shrink-0" />
          <span>
            <span className="text-muted-foreground">Eligible Solution Providers (can view & submit): </span>
            {eligibleSolverLabels.length > 0 ? (
              <span className="flex flex-wrap gap-1 mt-0.5">
                {eligibleSolverLabels.map((label) => (
                  <Badge key={label} variant="secondary" className="text-[11px]">{label}</Badge>
                ))}
              </span>
            ) : (
              <Badge variant="secondary" className="text-[11px] ml-1">All Solution Provider Types</Badge>
            )}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Eye className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
          <span>
            <span className="text-muted-foreground">Visible to: </span>
            <Badge variant="outline" className="text-[11px] ml-1">{visLabel}</Badge>
          </span>
        </div>
      </div>
    </div>
  );
}
