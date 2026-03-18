/**
 * LegalReAcceptModal — Shown when legal terms have been updated via amendment.
 * Solver must review and accept before submitting new work.
 * Now uses legal_reacceptance_records for structured tracking with deadline.
 */

import { Loader2, FileText, ShieldCheck, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  useAcceptLegalReacceptance,
  type PendingReacceptance,
} from '@/hooks/cogniblend/useLegalReacceptance';

/* ─── Types ──────────────────────────────────────────────── */

interface LegalReAcceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  userId: string;
  record: PendingReacceptance;
}

/* ─── Component ──────────────────────────────────────────── */

export function LegalReAcceptModal({
  open,
  onOpenChange,
  challengeId,
  userId,
  record,
}: LegalReAcceptModalProps) {
  const acceptMutation = useAcceptLegalReacceptance();

  const handleAccept = () => {
    acceptMutation.mutate(
      {
        recordId: record.id,
        challengeId,
        userId,
        amendmentNumber: record.amendment_number ?? 1,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  };

  const isUrgent = record.days_remaining <= 2;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <FileText className="h-5 w-5 text-primary" />
            Legal Terms Updated
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
          {/* Warning banner */}
          <div className="rounded-lg border border-[hsl(38,60%,70%)] bg-[hsl(38,60%,97%)] p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">
              The legal terms for this challenge have been updated as part of
              Amendment #{record.amendment_number ?? '—'}.
            </p>
            <p className="text-xs text-muted-foreground">
              You must review and accept the updated terms before you can submit
              new work or make changes to your submission.
            </p>
          </div>

          {/* Deadline indicator */}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <Clock className={`h-4 w-4 shrink-0 ${isUrgent ? 'text-destructive' : 'text-muted-foreground'}`} />
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${isUrgent ? 'text-destructive' : 'text-foreground'}`}>
                {record.days_remaining} day{record.days_remaining !== 1 ? 's' : ''} remaining
              </p>
              <p className="text-[10px] text-muted-foreground">
                Deadline: {format(new Date(record.deadline_at), 'MMM d, yyyy')}
              </p>
            </div>
            {isUrgent && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                Urgent
              </Badge>
            )}
          </div>

          {/* Consequences notice */}
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
            <p className="text-[11px] text-destructive/80">
              If not accepted within {record.days_remaining} day{record.days_remaining !== 1 ? 's' : ''},
              your enrollment will be paused and you will not be able to submit solutions until you accept.
            </p>
          </div>

          {/* Legal notice */}
          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground italic">
              By accepting, you acknowledge that you have reviewed the updated
              legal terms and agree to be bound by them. This acceptance will be
              logged in the legal acceptance ledger for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={acceptMutation.isPending}
          >
            Review Later
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={acceptMutation.isPending}
          >
            {acceptMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4 mr-1.5" />
            )}
            Accept Updated Terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
