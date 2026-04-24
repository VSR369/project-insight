/**
 * QuickSubmissionDetail — Right-side detail + Accept/Decline panel for QuickReviewPage.
 *
 * Engagement-aware contact label routes through engagementModelRulesService
 * (no `engagementModel === 'AGG'` literals in components — R10).
 *
 * Accept fires the existing legal-gate (WINNER_SELECTED) before mutation.
 */

import { useState } from 'react';
import { CheckCircle, XCircle, MessageSquare, FileText, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { directContactEnabled } from '@/services/engagementModelRulesService';
import {
  useAcceptQuickSubmission,
  useDeclineQuickSubmission,
  type QuickSubmission,
} from '@/hooks/cogniblend/useQuickReview';
import { useLegalGateAction } from '@/hooks/legal/useLegalGateAction';
import { LegalGateModal } from '@/components/legal/LegalGateModal';
import type { EngagementCode } from '@/constants/solverRouting.constants';

interface QuickSubmissionDetailProps {
  submission: QuickSubmission;
  challengeId: string;
  engagementCode: EngagementCode;
  userId: string;
}

const MIN_NOTE_LEN = 10;

export function QuickSubmissionDetail({
  submission,
  challengeId,
  engagementCode,
  userId,
}: QuickSubmissionDetailProps) {
  const [note, setNote] = useState('');
  const [pendingAction, setPendingAction] = useState<'accept' | 'decline' | null>(null);

  const acceptMutation = useAcceptQuickSubmission();
  const declineMutation = useDeclineQuickSubmission();

  const legalGate = useLegalGateAction({
    triggerEvent: 'WINNER_SELECTED',
    challengeId,
    userRole: 'CR',
    governanceMode: 'QUICK',
  });

  const isDecided = submission.status === 'ACCEPTED' || submission.status === 'DECLINED';
  const noteValid = note.trim().length >= MIN_NOTE_LEN;
  const contactEnabled = directContactEnabled(engagementCode);

  const runAccept = () => {
    acceptMutation.mutate({
      submissionId: submission.id,
      challengeId,
      userId,
      note: note.trim(),
    });
    setPendingAction(null);
  };

  const runDecline = () => {
    declineMutation.mutate({
      submissionId: submission.id,
      challengeId,
      userId,
      note: note.trim(),
    });
    setPendingAction(null);
  };

  const handleConfirmAccept = () => {
    legalGate.gateAction(runAccept);
  };

  const files = submission.submissionFiles ?? [];

  return (
    <div className="space-y-4">
      {/* Submission header */}
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground truncate">{submission.submitterName}</h2>
          <p className="text-xs text-muted-foreground">
            Submitted {new Date(submission.submittedAt).toLocaleString()}
          </p>
        </div>
        <Badge variant={isDecided ? 'outline' : 'secondary'}>
          {submission.status?.toUpperCase() ?? 'PENDING'}
        </Badge>
      </div>

      {/* Solution text */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" /> Submission
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground whitespace-pre-wrap">
            {submission.submissionText ?? 'No description provided.'}
          </p>
          {files.length > 0 && (
            <ul className="mt-3 space-y-1">
              {files.map((f, idx) => (
                <li key={idx} className="text-xs text-foreground">
                  📎 {f.name ?? `File ${idx + 1}`}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Provider contact mode */}
      <Card className="border-border bg-muted/30">
        <CardContent className="p-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary shrink-0" />
          <p className="text-xs text-foreground">
            {contactEnabled
              ? 'Contact this Solution Provider directly via the platform.'
              : 'All communication is mediated by the platform — provider contact details are hidden.'}
          </p>
        </CardContent>
      </Card>

      <Separator />

      {/* Decision */}
      {isDecided ? (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Decision recorded — no further action available.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Decision note <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={`Required — minimum ${MIN_NOTE_LEN} characters explaining your decision.`}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              {note.trim().length}/{MIN_NOTE_LEN} characters minimum
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            <Button
              variant="destructive"
              disabled={!noteValid || declineMutation.isPending}
              onClick={() => setPendingAction('decline')}
              className="lg:w-auto"
            >
              <XCircle className="h-4 w-4 mr-1.5" /> Decline
            </Button>
            <div className="flex-1" />
            <Button
              disabled={!noteValid || acceptMutation.isPending}
              onClick={() => setPendingAction('accept')}
            >
              <CheckCircle className="h-4 w-4 mr-1.5" /> Accept as winner
            </Button>
          </div>
        </div>
      )}

      {/* Confirmation dialog */}
      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === 'accept' ? 'Accept as winner?' : 'Decline this submission?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === 'accept'
                ? 'You will be asked to accept the legal terms before the winner is finalized. The challenge will close automatically once accepted.'
                : 'The Solution Provider will be notified that their submission was not selected.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={pendingAction === 'accept' ? handleConfirmAccept : runDecline}>
              {pendingAction === 'accept' ? 'Continue to legal acceptance' : 'Confirm decline'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Legal gate modal — fired before accept */}
      {legalGate.showGate && (
        <LegalGateModal
          open={legalGate.showGate}
          triggerEvent={legalGate.triggerEvent}
          challengeId={legalGate.challengeId}
          userRole={legalGate.userRole}
          governanceMode={legalGate.governanceMode}
          onAllAccepted={legalGate.handleAllAccepted}
          onDeclined={legalGate.handleDeclined}
        />
      )}
    </div>
  );
}
