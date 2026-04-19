/**
 * Pass3OverdueBanner — Banner shown to Curators when Creator approval is
 * overdue (past the configured timeout). Provides an "Override & Proceed"
 * action that prompts the Curator for a justification and applies the
 * timeout_override status.
 */
import { useState } from 'react';
import { Clock, ShieldCheck, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export interface Pass3OverdueBannerProps {
  daysOverdue: number;
  onOverride: (reason: string) => void | Promise<void>;
  isOverriding: boolean;
}

export function Pass3OverdueBanner({
  daysOverdue,
  onOverride,
  isOverriding,
}: Pass3OverdueBannerProps) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    const reason = window.prompt(
      'Reason for overriding Creator approval (will be logged):',
      '',
    );
    if (!reason || !reason.trim()) return;
    setBusy(true);
    try {
      await onOverride(reason.trim());
    } finally {
      setBusy(false);
    }
  };

  const disabled = busy || isOverriding;
  const dayLabel = daysOverdue === 1 ? 'day' : 'days';

  return (
    <Alert variant="destructive" className="border-destructive/40">
      <Clock className="h-4 w-4" />
      <AlertTitle>Creator approval overdue</AlertTitle>
      <AlertDescription className="space-y-3">
        <p className="text-sm">
          The Creator has not responded within the approval window — currently{' '}
          <span className="font-semibold">
            {daysOverdue} {dayLabel}
          </span>{' '}
          past the deadline. You can override and proceed to publication.
        </p>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleClick}
          disabled={disabled}
          className="gap-2"
        >
          {disabled ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <ShieldCheck className="h-3.5 w-3.5" />
          )}
          Override &amp; Proceed
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export default Pass3OverdueBanner;
