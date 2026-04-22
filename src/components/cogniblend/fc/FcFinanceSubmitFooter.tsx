/**
 * FcFinanceSubmitFooter — Bottom action card for the FC finance workspace.
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
  canSubmitPath: boolean;
  submitting: boolean;
  onSubmit: () => void;
}

export function FcFinanceSubmitFooter({ challengeId, userId, escrowStatus, fcComplianceComplete, canSubmitPath, submitting, onSubmit }: FcFinanceSubmitFooterProps) {
  const submitDisabled = submitting || !canSubmitPath || !!fcComplianceComplete;

  return (
    <Card>
      <CardContent className="flex flex-col items-start justify-between gap-3 py-4 lg:flex-row lg:items-center">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold">
            Escrow:
            <Badge variant={canSubmitPath ? 'default' : 'secondary'}>
              {escrowStatus ?? 'Pending'}
            </Badge>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {!canSubmitPath
              ? 'All scheduled installments must be funded before submitting financial review to the Curator.'
              : 'Escrow schedule is fully funded — submit the financial review to return the challenge to the Curator.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <FcReturnToCurator challengeId={challengeId} userId={userId} disabled={submitting} />
        </div>
        <Button onClick={onSubmit} disabled={submitDisabled}>
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
          {fcComplianceComplete ? 'Already Submitted' : 'Submit Financial Review'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default FcFinanceSubmitFooter;
