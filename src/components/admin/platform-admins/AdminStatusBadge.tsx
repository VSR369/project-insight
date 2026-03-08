import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface AdminStatusBadgeProps {
  status: string;
  className?: string;
}

const STATUS_STYLES: Record<string, { label: string; classes: string }> = {
  Available: {
    label: 'Available',
    classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
  },
  Partially_Available: {
    label: 'Partially Available',
    classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
  },
  Fully_Loaded: {
    label: 'Fully Loaded',
    classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-100',
  },
  On_Leave: {
    label: 'On Leave',
    classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  },
  Inactive: {
    label: 'Inactive',
    classes: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  },
};

export function AdminStatusBadge({ status, className }: AdminStatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Inactive;
  return (
    <Badge variant="secondary" className={cn(style.classes, className)}>
      {style.label}
    </Badge>
  );
}
