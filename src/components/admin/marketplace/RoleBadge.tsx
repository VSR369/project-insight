/**
 * RoleBadge — Colored pill badge for SLM role codes
 */

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const ROLE_STYLES: Record<string, { label: string; className: string }> = {
  R3: {
    label: "Architect",
    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 dark:border-blue-800",
  },
  R5_MP: {
    label: "Curator",
    className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800",
  },
  R6_MP: {
    label: "Director",
    className: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300 border-teal-200 dark:border-teal-800",
  },
  R7_MP: {
    label: "Reviewer",
    className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300 border-orange-200 dark:border-orange-800",
  },
};

interface RoleBadgeProps {
  code: string;
  className?: string;
}

export function RoleBadge({ code, className }: RoleBadgeProps) {
  const style = ROLE_STYLES[code] ?? { label: code, className: "bg-muted text-muted-foreground" };
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", style.className, className)}>
      {style.label}
    </Badge>
  );
}
