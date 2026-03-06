import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useClaimFromQueue } from '@/hooks/queries/useVerificationMutations';
import { SLAStatusBadge } from './SLAStatusBadge';
import { formatDistanceToNow } from 'date-fns';
import { Info } from 'lucide-react';

interface ClaimConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: {
    id: string;
    verification_id: string;
    entered_at: string;
    verification?: {
      sla_breach_tier?: string | null;
      sla_start_at?: string | null;
      sla_duration_seconds?: number;
      sla_paused_duration_hours?: number | null;
      organization?: { organization_name?: string } | null;
    } | null;
  };
}

/**
 * MOD-M-01: Claim Confirmation Modal
 */
export function ClaimConfirmationModal({ open, onOpenChange, entry }: ClaimConfirmationModalProps) {
  const claimMutation = useClaimFromQueue();
  const ver = entry.verification;
  const orgName = ver?.organization?.organization_name ?? 'Unknown Organization';

  const handleClaim = () => {
    claimMutation.mutate(entry.id, {
      onSuccess: () => onOpenChange(false),
    });
  };

  // Compute elapsed %
  let elapsedPctText = '—';
  if (ver?.sla_start_at && ver?.sla_duration_seconds) {
    const elapsed = (Date.now() - new Date(ver.sla_start_at).getTime()) / 1000 - (ver.sla_paused_duration_hours ?? 0) * 3600;
    elapsedPctText = `${Math.round((elapsed / ver.sla_duration_seconds) * 100)}%`;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Verification</DialogTitle>
          <DialogDescription>
            You are about to claim this verification for review.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-md border p-3 space-y-2">
            <p className="font-medium">{orgName}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Time in queue: {formatDistanceToNow(new Date(entry.entered_at))}</span>
              <span>SLA: {elapsedPctText}</span>
            </div>
            <SLAStatusBadge breachTier={ver?.sla_breach_tier ?? 'NONE'} />
          </div>

          <div className="flex items-start gap-2 rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
            <Info className="h-4 w-4 mt-0.5 shrink-0" />
            <span>The SLA clock does <strong>NOT</strong> reset when you claim from the queue. Time already elapsed continues to count.</span>
          </div>

          {claimMutation.error && (
            <p className="text-sm text-destructive">
              {claimMutation.error.message === 'ALREADY_CLAIMED'
                ? 'This verification was just claimed by another admin.'
                : claimMutation.error.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleClaim} disabled={claimMutation.isPending}>
            {claimMutation.isPending ? 'Claiming...' : 'Confirm Claim'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
