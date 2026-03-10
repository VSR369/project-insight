/**
 * RoleBadge — Colored pill badge for SLM role codes
 * Label is passed from parent (sourced from master data).
 * Color mapping by code is visual config only.
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/** Visual color mapping keyed by role code — not data duplication, purely UI styling */
const ROLE_COLOR_MAP: Record<string, string> = {
  R3: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  R5_MP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  R6_MP: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  R7_MP: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
};

interface RoleBadgeProps {
  code: string;
  label: string;
  className?: string;
}

export function RoleBadge({ code, label, className }: RoleBadgeProps) {
  const colorClass = ROLE_COLOR_MAP[code] ?? "bg-muted text-muted-foreground";
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", colorClass, className)}>
      {label}
    </Badge>
  );
}
