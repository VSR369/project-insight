import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

/**
 * StatusBadge component with forwardRef to prevent React ref warnings
 * when used inside DataTable's flexRender.
 */
const StatusBadge = React.forwardRef<HTMLDivElement, StatusBadgeProps>(
  ({ isActive, activeLabel = "Active", inactiveLabel = "Inactive", className }, ref) => {
    return (
      <Badge
        ref={ref}
        variant={isActive ? "default" : "secondary"}
        className={cn(
          isActive
            ? "bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100"
            : "bg-gray-100 text-gray-600 hover:bg-gray-100 dark:bg-gray-800 dark:text-gray-400",
          className
        )}
      >
        {isActive ? activeLabel : inactiveLabel}
      </Badge>
    );
  }
);
StatusBadge.displayName = "StatusBadge";

export { StatusBadge };
