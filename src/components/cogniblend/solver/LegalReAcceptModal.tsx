/**
 * LegalReAcceptModal — Shown when legal terms have been updated via amendment.
 * Solver must review and accept before submitting new work.
 */

import { Loader2, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useReAcceptLegal } from '@/hooks/cogniblend/useSolverAmendmentStatus';

/* ─── Types ──────────────────────────────────────────────── */

interface LegalReAcceptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  userId: string;
  amendmentNumber: number;
}

/* ─── Component ──────────────────────────────────────────── */

export function LegalReAcceptModal({
  open,
  onOpenChange,
  challengeId,
  userId,
  amendmentNumber,
}: LegalReAcceptModalProps) {
  const reAcceptMutation = useReAcceptLegal();

  const handleAccept = () => {
    reAcceptMutation.mutate(
      { challengeId, userId, amendmentNumber },
      { onSuccess: () => onOpenChange(false) },
    );
  };

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
          <div className="rounded-lg border border-[hsl(38,60%,70%)] bg-[hsl(38,60%,97%)] p-4 space-y-2">
            <p className="text-sm font-medium text-foreground">
              The legal terms for this challenge have been updated as part of Amendment #{amendmentNumber}.
            </p>
            <p className="text-xs text-muted-foreground">
              You must review and accept the updated terms before you can submit new work or make changes to your submission.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground italic">
              By accepting, you acknowledge that you have reviewed the updated legal terms and agree to be bound by them. This acceptance will be logged in the legal acceptance ledger for audit purposes.
            </p>
          </div>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={reAcceptMutation.isPending}
          >
            Review Later
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            disabled={reAcceptMutation.isPending}
          >
            {reAcceptMutation.isPending ? (
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
