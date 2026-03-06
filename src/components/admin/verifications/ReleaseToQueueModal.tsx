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
import { useReleaseToQueue } from '@/hooks/queries/useVerificationMutations';
import { ReleaseWindowCountdown } from './ReleaseWindowCountdown';

interface ReleaseToQueueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  verificationId: string;
  assignedAt: string;
  windowHours?: number;
}

/**
 * MOD-M-02: Release to Queue Modal
 */
export function ReleaseToQueueModal({
  open,
  onOpenChange,
  verificationId,
  assignedAt,
  windowHours = 2,
}: ReleaseToQueueModalProps) {
  const [reason, setReason] = useState('');
  const releaseMutation = useReleaseToQueue();

  const isValid = reason.trim().length >= 20;

  const handleRelease = () => {
    releaseMutation.mutate(
      { verificationId, reason: reason.trim() },
      { onSuccess: () => { setReason(''); onOpenChange(false); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Release to Queue</DialogTitle>
          <DialogDescription>
            Return this verification to the open queue for another admin to claim.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <ReleaseWindowCountdown assignedAt={assignedAt} windowHours={windowHours} />

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason (min 20 characters)</label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you are releasing this verification..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">{reason.length}/20 characters minimum</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleRelease}
            disabled={!isValid || releaseMutation.isPending}
          >
            {releaseMutation.isPending ? 'Releasing...' : 'Confirm Release'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
