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

interface RejectReasonModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (notes: string) => void;
  isPending: boolean;
}

/**
 * GAP-14: Rejection reason modal
 */
export function RejectReasonModal({ open, onOpenChange, onConfirm, isPending }: RejectReasonModalProps) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Verification</DialogTitle>
          <DialogDescription>
            Please provide a reason for rejecting this verification.
          </DialogDescription>
        </DialogHeader>
        <div className="py-2 space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Enter rejection reason (min 10 characters)..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{reason.length}/10 characters minimum</p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={() => { onConfirm(reason.trim()); setReason(''); }}
            disabled={!isValid || isPending}
          >
            {isPending ? 'Rejecting...' : 'Confirm Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
