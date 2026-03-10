/**
 * AvailabilityBadge — Color-coded availability pill (BR-POOL-002)
 * Green = Available, Amber = Partially Available, Red = Fully Booked
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AvailabilityBadgeProps {
  status: string;
  className?: string;
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  available: {
    label: "Available",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  },
  partially_available: {
    label: "Partially Available",
    className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  },
  fully_booked: {
    label: "Fully Booked",
    className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
  },
};

export function AvailabilityBadge({ status, className }: AvailabilityBadgeProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.available;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className, className)}>
      {config.label}
    </Badge>
  );
}
