/**
 * RoleAssignmentStatusBadge — renders status badge with color from md_role_assignment_statuses
 * Zero hardcoded colors — all driven by DB master data
 */

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRoleAssignmentStatuses } from "@/hooks/queries/useRoleAssignmentStatuses";

interface RoleAssignmentStatusBadgeProps {
  statusCode: string;
  className?: string;
}

const RoleAssignmentStatusBadge = React.forwardRef<HTMLDivElement, RoleAssignmentStatusBadgeProps>(
  ({ statusCode, className }, ref) => {
    const { data: statuses } = useRoleAssignmentStatuses();
    const statusMeta = statuses?.find((s) => s.code === statusCode);

    return (
      <Badge
        ref={ref}
        variant="outline"
        className={cn(
          "text-xs font-medium",
          statusMeta?.color_class ?? "bg-muted text-muted-foreground",
          className
        )}
      >
        {statusMeta?.display_name ?? statusCode}
      </Badge>
    );
  }
);
RoleAssignmentStatusBadge.displayName = "RoleAssignmentStatusBadge";

export { RoleAssignmentStatusBadge };
