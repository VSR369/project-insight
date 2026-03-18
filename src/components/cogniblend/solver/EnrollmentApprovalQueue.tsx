/**
 * EnrollmentApprovalQueue — Admin panel for reviewing PENDING solver enrollments.
 * Used for non-open models (OC, CE, IO, DR) where admin approval is required.
 * R-05: §5.7.4 enrollment workflow compliance.
 */

import { useState } from 'react';
import {
  usePendingEnrollments,
  useApproveEnrollment,
  useRejectEnrollment,
} from '@/hooks/cogniblend/useSolverEnrollment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Loader2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

/* ─── Types ──────────────────────────────────────────────── */

interface EnrollmentApprovalQueueProps {
  challengeId: string;
}

/* ─── Component ──────────────────────────────────────────── */

export function EnrollmentApprovalQueue({ challengeId }: EnrollmentApprovalQueueProps) {
  const { data: pendingEnrollments, isLoading } = usePendingEnrollments(challengeId);
  const approveMutation = useApproveEnrollment();
  const rejectMutation = useRejectEnrollment();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedEnrollmentId, setSelectedEnrollmentId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const handleApprove = (enrollmentId: string) => {
    approveMutation.mutate({ enrollmentId, challengeId });
  };

  const handleRejectClick = (enrollmentId: string) => {
    setSelectedEnrollmentId(enrollmentId);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedEnrollmentId) return;
    rejectMutation.mutate(
      { enrollmentId: selectedEnrollmentId, challengeId, reason: rejectReason || undefined },
      { onSuccess: () => { setRejectDialogOpen(false); setSelectedEnrollmentId(null); } },
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading enrollment queue…
        </CardContent>
      </Card>
    );
  }

  const enrollments = pendingEnrollments ?? [];

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            Enrollment Approval Queue
            {enrollments.length > 0 && (
              <span className="ml-auto text-xs font-normal bg-accent text-accent-foreground px-2 py-0.5 rounded-full">
                {enrollments.length} pending
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No pending enrollment requests.
            </p>
          ) : (
            enrollments.map((enrollment) => (
              <div
                key={enrollment.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    Solver {enrollment.solver_id.slice(0, 8)}…
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {enrollment.enrollment_model} · Requested{' '}
                    {formatDistanceToNow(new Date(enrollment.enrolled_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                    onClick={() => handleApprove(enrollment.id)}
                    disabled={approveMutation.isPending}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/5"
                    onClick={() => handleRejectClick(enrollment.id)}
                    disabled={rejectMutation.isPending}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Rejection reason dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="w-full max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Enrollment</DialogTitle>
            <DialogDescription>
              Provide an optional reason for rejecting this enrollment request.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
