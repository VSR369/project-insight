/**
 * LcLegalSubmitFooter — Bottom action card for the LC legal workspace.
 * Shows doc count + Submit/Approve/Return controls. Extracted from
 * LcLegalWorkspacePage to keep it under the 250-line cap.
 */
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { LcReturnToCurator } from '@/components/cogniblend/lc/LcReturnToCurator';
import { LcApproveAction } from '@/components/cogniblend/lc/LcApproveAction';

export interface LcLegalSubmitFooterProps {
  challengeId: string;
  userId: string;
  totalAccepted: number;
  currentPhase: number | null | undefined;
  lcComplianceComplete: boolean | null | undefined;
  submitting: boolean;
  onSubmit: () => void;
}

export function LcLegalSubmitFooter({
  challengeId,
  userId,
  totalAccepted,
  currentPhase,
  lcComplianceComplete,
  submitting,
  onSubmit,
}: LcLegalSubmitFooterProps) {
  const phaseGateOk = currentPhase === 2;
  const submitDisabled = submitting || !phaseGateOk || !!lcComplianceComplete;

  return (
    <Card>
      <CardContent className="py-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">
            {totalAccepted} legal document{totalAccepted !== 1 ? 's' : ''} on file
          </p>
          <p className="text-xs text-muted-foreground">
            {!phaseGateOk
              ? `Challenge is currently at Phase ${currentPhase ?? '?'}. It must be at Phase 2 before LC can submit to curation.`
              : 'Run Pass 3 and accept the unified agreement before submitting.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <LcReturnToCurator challengeId={challengeId} userId={userId} disabled={submitting} />
          <LcApproveAction challengeId={challengeId} userId={userId} disabled={submitting} />
        </div>
        <Button onClick={onSubmit} disabled={submitDisabled}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {lcComplianceComplete ? 'Already Submitted' : 'Submit to Curation'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default LcLegalSubmitFooter;
