/**
 * MOD-04 SCR-04-01: Email delivery status badge (5 variants)
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  SENT: { label: 'Sent', className: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300' },
  PENDING: { label: 'Pending', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  RETRY_QUEUED: { label: 'Retrying', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  EXHAUSTED: { label: 'Exhausted', className: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200 font-semibold' },
};

interface EmailStatusBadgeProps {
  status: string;
  className?: string;
}

export function EmailStatusBadge({ status, className }: EmailStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('text-xs border-0', config.className, className)}>
      {config.label}
    </Badge>
  );
}
