import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  isActive: boolean;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export function StatusBadge({
  isActive,
  activeLabel = "Active",
  inactiveLabel = "Inactive",
  className,
}: StatusBadgeProps) {
  return (
    <Badge
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
