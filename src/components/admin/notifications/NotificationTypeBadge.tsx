/**
 * MOD-04 SCR-04-01: Color-coded notification type badge
 */
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const TYPE_CONFIG: Record<string, { label: string; className: string }> = {
  ASSIGNMENT: { label: 'Assignment', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300' },
  REASSIGNMENT_IN: { label: 'Reassigned In', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300' },
  REASSIGNMENT_OUT: { label: 'Reassigned Out', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
  SLA_WARNING: { label: 'SLA Warning', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  SLA_BREACH: { label: 'SLA Breach', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  SLA_CRITICAL: { label: 'SLA Critical', className: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200' },
  TIER1_WARNING: { label: 'Tier 1 Warning', className: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300' },
  TIER2_BREACH: { label: 'Tier 2 Breach', className: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300' },
  TIER3_CRITICAL: { label: 'Tier 3 Critical', className: 'bg-red-200 text-red-900 dark:bg-red-900/60 dark:text-red-200' },
  QUEUE_ESCALATION: { label: 'Queue Escalation', className: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300' },
  EMAIL_FAIL: { label: 'Email Fail', className: 'border border-red-300 bg-transparent text-red-700 dark:border-red-700 dark:text-red-400' },
  COURTESY_REGISTRANT: { label: 'Courtesy', className: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300' },
};

interface NotificationTypeBadgeProps {
  type: string;
  className?: string;
}

export function NotificationTypeBadge({ type, className }: NotificationTypeBadgeProps) {
  const config = TYPE_CONFIG[type] ?? { label: type, className: 'bg-muted text-muted-foreground' };
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border-0', config.className, className)}>
      {config.label}
    </Badge>
  );
}
