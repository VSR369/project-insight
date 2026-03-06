import { useState } from 'react';
import { useVerificationAction } from '@/hooks/queries/useVerificationMutations';
import { ReleaseToQueueModal } from './ReleaseToQueueModal';
import { RequestReassignmentModal } from './RequestReassignmentModal';
import { ApproveConfirmModal } from './ApproveConfirmModal';
import { RejectReasonModal } from './RejectReasonModal';
import { ReleaseWindowCountdown } from './ReleaseWindowCountdown';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, RotateCcw, ArrowRightLeft, Undo2 } from 'lucide-react';

interface VerificationActionBarProps {
  verificationId: string;
  orgName: string;
  checks: Array<{ check_id: string; result: string }>;
  reassignmentCount: number;
  currentAssignment: { id: string; assigned_at: string; assignment_method: string } | null;
}

/**
 * GAP-14: Approve/Reject confirmation dialogs
 */
export function VerificationActionBar({
  verificationId,
  orgName,
  checks,
  reassignmentCount,
  currentAssignment,
}: VerificationActionBarProps) {
  const actionMutation = useVerificationAction();
  const [showRelease, setShowRelease] = useState(false);
  const [showReassign, setShowReassign] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showReject, setShowReject] = useState(false);

  const v6Check = checks.find(c => c.check_id === 'V6');
  const canApprove = v6Check?.result === 'Pass';

  const showReleaseButton = currentAssignment?.assigned_at
    ? (Date.now() - new Date(currentAssignment.assigned_at).getTime()) < 2 * 3600 * 1000
    : false;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 py-3">
        <div className="flex items-center justify-between max-w-7xl mx-auto gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {showReleaseButton && currentAssignment && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setShowRelease(true)}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Release to Queue
                </Button>
                <ReleaseWindowCountdown assignedAt={currentAssignment.assigned_at} />
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              disabled={reassignmentCount >= 3}
              onClick={() => setShowReassign(true)}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Request Reassignment
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => actionMutation.mutate({ verificationId, action: 'Returned_for_Correction' })}
              disabled={actionMutation.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Return for Correction
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="gap-1.5"
              onClick={() => setShowReject(true)}
              disabled={actionMutation.isPending}
            >
              <XCircle className="h-3.5 w-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              className="gap-1.5 bg-emerald-600 hover:bg-emerald-700"
              disabled={!canApprove || actionMutation.isPending}
              onClick={() => setShowApprove(true)}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        </div>
      </div>

      {showRelease && currentAssignment && (
        <ReleaseToQueueModal
          open={showRelease}
          onOpenChange={setShowRelease}
          verificationId={verificationId}
          assignedAt={currentAssignment.assigned_at}
        />
      )}

      {showReassign && (
        <RequestReassignmentModal
          open={showReassign}
          onOpenChange={setShowReassign}
          verificationId={verificationId}
          reassignmentCount={reassignmentCount}
        />
      )}

      <ApproveConfirmModal
        open={showApprove}
        onOpenChange={setShowApprove}
        orgName={orgName}
        onConfirm={() => {
          actionMutation.mutate({ verificationId, action: 'Approved' });
          setShowApprove(false);
        }}
        isPending={actionMutation.isPending}
      />

      <RejectReasonModal
        open={showReject}
        onOpenChange={setShowReject}
        onConfirm={(notes) => {
          actionMutation.mutate({ verificationId, action: 'Rejected', notes });
          setShowReject(false);
        }}
        isPending={actionMutation.isPending}
      />
    </>
  );
}
