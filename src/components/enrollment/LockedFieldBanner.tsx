/**
 * Locked Field Banner
 * 
 * Alert banner shown when a section is locked based on lifecycle status.
 */

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Lock, AlertTriangle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

type LockLevel = 'configuration' | 'content' | 'everything';

interface LockedFieldBannerProps {
  lockLevel: LockLevel;
  reason?: string;
  className?: string;
}

const lockConfig: Record<LockLevel, {
  icon: typeof Lock;
  title: string;
  defaultReason: string;
  variant: 'default' | 'destructive';
  bgClass: string;
  iconClass: string;
}> = {
  configuration: {
    icon: Lock,
    title: 'Configuration Locked',
    defaultReason: 'Industry and expertise settings cannot be changed during or after assessment.',
    variant: 'default',
    bgClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800',
    iconClass: 'text-amber-600 dark:text-amber-400',
  },
  content: {
    icon: AlertTriangle,
    title: 'Section Locked',
    defaultReason: 'This section is locked after panel scheduling. Please contact support if changes are needed.',
    variant: 'default',
    bgClass: 'bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800',
    iconClass: 'text-orange-600 dark:text-orange-400',
  },
  everything: {
    icon: ShieldCheck,
    title: 'Profile Frozen',
    defaultReason: 'Your profile is verified and cannot be modified. Contact support for any changes.',
    variant: 'destructive',
    bgClass: 'bg-slate-50 border-slate-300 dark:bg-slate-900 dark:border-slate-700',
    iconClass: 'text-slate-600 dark:text-slate-400',
  },
};

export function LockedFieldBanner({
  lockLevel,
  reason,
  className,
}: LockedFieldBannerProps) {
  const config = lockConfig[lockLevel];
  const Icon = config.icon;

  return (
    <Alert className={cn(config.bgClass, 'border', className)}>
      <Icon className={cn('h-4 w-4', config.iconClass)} />
      <AlertTitle className="text-foreground">{config.title}</AlertTitle>
      <AlertDescription className="text-muted-foreground">
        {reason || config.defaultReason}
      </AlertDescription>
    </Alert>
  );
}
