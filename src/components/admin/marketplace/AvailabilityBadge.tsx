/**
 * AvailabilityBadge — Color-coded availability pill (BR-POOL-002)
 * Label is passed from parent (sourced from master data).
 * Color mapping by code is visual config only.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Visual color mapping keyed by availability code */
const STATUS_COLOR_MAP: Record<string, string> = {
  available: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
  partially_available: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border-amber-200 dark:border-amber-800",
  fully_booked: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-800",
};

interface AvailabilityBadgeProps {
  status: string;
  label: string;
  className?: string;
}

export function AvailabilityBadge({ status, label, className }: AvailabilityBadgeProps) {
  const colorClass = STATUS_COLOR_MAP[status] ?? STATUS_COLOR_MAP.available;
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", colorClass, className)}>
      {label}
    </Badge>
  );
}
