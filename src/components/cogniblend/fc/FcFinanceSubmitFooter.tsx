/**
 * FcFinanceSubmitFooter — Bottom action card for the FC finance workspace.
 * Mirrors LcLegalSubmitFooter. Surfaces escrow status + Return-to-Curator
 * + Submit-Financial-Review controls.
 */
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FcReturnToCurator } from '@/components/cogniblend/fc/FcReturnToCurator';

export interface FcFinanceSubmitFooterProps {
  challengeId: string;
  userId: string;
  escrowStatus: string | null;
  currentPhase: number | null | undefined;
  fcComplianceComplete: boolean | null | undefined;
  submitting: boolean;
  onSubmit: () => void;
}

export function FcFinanceSubmitFooter({
  challengeId,
  userId,
  escrowStatus,
  currentPhase,
  fcComplianceComplete,
  submitting,
  onSubmit,
}: FcFinanceSubmitFooterProps) {
  const phaseGateOk = currentPhase === 3;
  const isFunded = escrowStatus === 'FUNDED';
  const submitDisabled =
    submitting || !phaseGateOk || !isFunded || !!fcComplianceComplete;

  return (
    <Card>
      <CardContent className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold flex items-center gap-2">
            Escrow:
            <Badge variant={isFunded ? 'default' : 'secondary'}>
              {escrowStatus ?? 'Pending'}
            </Badge>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {!phaseGateOk
              ? `Challenge is currently at Phase ${currentPhase ?? '?'}. Finance review applies at Phase 3.`
              : !isFunded
                ? 'Confirm the escrow deposit above before submitting financial review.'
                : 'Escrow is funded — submit to advance the challenge.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FcReturnToCurator
            challengeId={challengeId}
            userId={userId}
            disabled={submitting}
          />
        </div>
        <Button onClick={onSubmit} disabled={submitDisabled}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {fcComplianceComplete ? 'Already Submitted' : 'Submit Financial Review'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default FcFinanceSubmitFooter;
