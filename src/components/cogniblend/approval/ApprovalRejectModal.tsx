/**
 * ApprovalRejectModal — Permanent rejection dialog.
 * Requires a reason of at least 100 characters. Shows a red warning.
 */

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
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ApprovalRejectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

const MIN_CHARS = 100;

export default function ApprovalRejectModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApprovalRejectModalProps) {
  const [reason, setReason] = useState('');
  const isValid = reason.trim().length >= MIN_CHARS;

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>Reject this challenge?</DialogTitle>
          <DialogDescription className="sr-only">
            Permanently reject this challenge.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-3">
          {/* Red warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive font-medium">
              This action is permanent and cannot be undone. The challenge will be
              cancelled and all role holders will be notified.
            </p>
          </div>

          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a detailed rejection reason (min 100 characters)..."
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            {reason.trim().length}/{MIN_CHARS} characters minimum
          </p>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : null}
            {isPending ? 'Rejecting...' : 'Reject Challenge'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
