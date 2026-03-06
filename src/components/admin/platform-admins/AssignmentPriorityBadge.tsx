/**
 * Color-coded badge for assignment priority (1-10).
 * 1-3 green, 4-7 amber, 8-10 red.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AssignmentPriorityBadgeProps {
  priority: number;
}

export function AssignmentPriorityBadge({ priority }: AssignmentPriorityBadgeProps) {
  const colorClass =
    priority <= 3
      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
      : priority <= 7
        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100'
        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';

  return (
    <Badge variant="secondary" className={cn(colorClass, 'font-mono')}>
      {priority}
    </Badge>
  );
}
