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
  fcComplianceComplete: boolean | null | undefined;
  submitting: boolean;
  onSubmit: () => void;
}

export function FcFinanceSubmitFooter({
  challengeId,
  userId,
  escrowStatus,
  fcComplianceComplete,
  submitting,
  onSubmit,
}: FcFinanceSubmitFooterProps) {
  const isFunded = escrowStatus === 'FUNDED';
  const submitDisabled = submitting || !isFunded || !!fcComplianceComplete;

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
            {!isFunded
              ? 'Confirm funding in the FC deposit record above before submitting financial review to the Curator.'
              : 'Escrow is funded — submit the financial review to return the challenge to the Curator.'}
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
