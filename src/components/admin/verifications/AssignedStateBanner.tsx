import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface AssignedStateBannerProps {
  state: 2 | 3;
  assignedAdminName?: string;
  onReassignToMe?: () => void;
  onForceReassign?: () => void;
  isFullyLoaded?: boolean;
}

/**
 * Banner shown on verification detail when user is NOT the assigned admin.
 * STATE 2 (supervisor): Amber read-only + "Reassign to Me" + "Force Reassign" (GAP-8, SCR-06-02)
 * STATE 3 (other admin): Red blocked
 */
export function AssignedStateBanner({ state, assignedAdminName, onReassignToMe, onForceReassign, isFullyLoaded }: AssignedStateBannerProps) {
  if (state === 2) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Read-Only View.</strong> This verification is assigned to{' '}
            <strong>{assignedAdminName ?? 'another admin'}</strong>. You can view but not modify.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onForceReassign && (
            <Button size="sm" variant="outline" onClick={onForceReassign}>
              Force Reassign
            </Button>
          )}
          {onReassignToMe && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button size="sm" variant="default" onClick={onReassignToMe} disabled={isFullyLoaded}>
                    Reassign to Me
                  </Button>
                </span>
              </TooltipTrigger>
              {isFullyLoaded && (
                <TooltipContent>You are at maximum workload capacity</TooltipContent>
              )}
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
      <ShieldAlert className="h-4 w-4 shrink-0" />
      <span>
        <strong>Access Restricted.</strong> This verification is assigned to another admin.
        Contact a supervisor if you need access.
      </span>
    </div>
  );
}
