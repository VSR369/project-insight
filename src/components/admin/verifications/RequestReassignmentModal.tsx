import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useRequestReassignment } from '@/hooks/queries/useVerificationMutations';
import { AlertTriangle } from 'lucide-react';

interface RequestReassignmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verificationId: string;
  reassignmentCount: number;
  maxReassignments?: number;
}

/**
 * MOD-M-03: Request Reassignment Modal
 */
export function RequestReassignmentModal({
  open,
  onOpenChange,
  verificationId,
  reassignmentCount,
  maxReassignments = 3,
}: RequestReassignmentModalProps) {
  const [reason, setReason] = useState('');
  const reassignMutation = useRequestReassignment();

  const isValid = reason.trim().length >= 20;
  const isAtLimit = reassignmentCount >= maxReassignments;
  const isNearLimit = reassignmentCount === maxReassignments - 1;

  const handleSubmit = () => {
    reassignMutation.mutate(
      { verificationId, reason: reason.trim() },
      { onSuccess: () => { setReason(''); onOpenChange(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Request Reassignment</DialogTitle>
          <DialogDescription>
            Submit a request to supervisors to reassign this verification.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isNearLimit && (
            <div className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>This is the last allowed reassignment request ({reassignmentCount}/{maxReassignments}).</span>
            </div>
          )}

          {isAtLimit && (
            <div className="flex items-start gap-2 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Maximum reassignment limit reached. This verification cannot be reassigned again.</span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (min 20 characters)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need this verification reassigned..."
              rows={3}
              disabled={isAtLimit}
            />
            <p className="text-xs text-muted-foreground">{reason.length}/20 characters minimum</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isAtLimit || reassignMutation.isPending}
          >
            {reassignMutation.isPending ? 'Submitting...' : 'Submit Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
