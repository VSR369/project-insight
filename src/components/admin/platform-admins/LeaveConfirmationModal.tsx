/**
 * MOD-M-08: Leave Confirmation Modal — 3 variants
 * IMMEDIATE (amber), SCHEDULED (blue), RESTORE (green)
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Calendar, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type LeaveVariant = 'immediate' | 'scheduled' | 'restore';

interface LeaveConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variant: LeaveVariant;
  leaveStart?: string;
  leaveEnd?: string;
  pendingVerifications?: number;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

const VARIANT_CONFIG: Record<LeaveVariant, {
  icon: typeof Calendar;
  title: string;
  description: string;
  headerClass: string;
  iconClass: string;
  confirmLabel: string;
  confirmVariant: 'default' | 'destructive' | 'outline';
}> = {
  immediate: {
    icon: AlertTriangle,
    title: 'Go On Leave Immediately',
    description: 'Your leave starts today. New verifications will not be assigned to you during this period.',
    headerClass: 'text-amber-700 dark:text-amber-400',
    iconClass: 'text-amber-600',
    confirmLabel: 'Confirm Immediate Leave',
    confirmVariant: 'default',
  },
  scheduled: {
    icon: Calendar,
    title: 'Schedule Leave',
    description: 'Your leave is scheduled for a future date. You will continue receiving assignments until the start date.',
    headerClass: 'text-blue-700 dark:text-blue-400',
    iconClass: 'text-blue-600',
    confirmLabel: 'Confirm Scheduled Leave',
    confirmVariant: 'default',
  },
  restore: {
    icon: CheckCircle,
    title: 'Restore to Available',
    description: 'You will be marked as Available and can start receiving new verification assignments.',
    headerClass: 'text-green-700 dark:text-green-400',
    iconClass: 'text-green-600',
    confirmLabel: 'Restore Availability',
    confirmVariant: 'default',
  },
};

export function LeaveConfirmationModal({
  open,
  onOpenChange,
  variant,
  leaveStart,
  leaveEnd,
  pendingVerifications = 0,
  onConfirm,
  isLoading,
}: LeaveConfirmationModalProps) {
  const config = VARIANT_CONFIG[variant];
  const Icon = config.icon;

  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className={cn('flex items-center gap-2', config.headerClass)}>
            <Icon className={cn('h-5 w-5', config.iconClass)} />
            {config.title}
          </DialogTitle>
          <DialogDescription>{config.description}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-3">
          {variant !== 'restore' && leaveStart && (
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Start Date</span>
                <span className="text-sm font-medium">{leaveStart}</span>
              </div>
              {leaveEnd && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">End Date</span>
                  <span className="text-sm font-medium">{leaveEnd}</span>
                </div>
              )}
            </div>
          )}

          {pendingVerifications > 0 && variant !== 'restore' && (
            <Alert
              className={cn(
                variant === 'immediate'
                  ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200'
                  : 'border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700 dark:bg-blue-950 dark:text-blue-200'
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Your <strong>{pendingVerifications}</strong> pending verification(s) will need to be reassigned during your absence.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading} variant={config.confirmVariant}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {config.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
