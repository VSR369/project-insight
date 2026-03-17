/**
 * ApprovalReturnModal — "Return for Modification" dialog.
 * Requires a reason of at least 50 characters.
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
import { Loader2, RotateCcw } from 'lucide-react';

interface ApprovalReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

const MIN_CHARS = 50;

export default function ApprovalReturnModal({
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApprovalReturnModalProps) {
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
          <DialogTitle>Return to Curator/Creator for Modifications</DialogTitle>
          <DialogDescription>
            This challenge will be returned for corrections. The assigned Curator
            (Enterprise) or Creator (Lightweight) will be notified.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 overflow-y-auto py-2 space-y-2">
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Describe what needs to be modified (min 50 characters)..."
            rows={4}
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
            variant="outline"
            className="border-amber-400 text-amber-700 hover:bg-amber-50"
            onClick={handleConfirm}
            disabled={!isValid || isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
            ) : (
              <RotateCcw className="h-4 w-4 mr-1.5" />
            )}
            {isPending ? 'Returning...' : 'Return'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
