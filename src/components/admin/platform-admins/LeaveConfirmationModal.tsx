/**
 * MOD-M-08: Leave Confirmation Modal
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Calendar } from 'lucide-react';

interface LeaveConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveStart: string;
  leaveEnd: string;
  onConfirm: () => Promise<void>;
  isLoading: boolean;
}

export function LeaveConfirmationModal({
  open,
  onOpenChange,
  leaveStart,
  leaveEnd,
  onConfirm,
  isLoading,
}: LeaveConfirmationModalProps) {
  const handleConfirm = async () => {
    await onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Confirm Leave
          </DialogTitle>
          <DialogDescription>
            You are about to set your status to On Leave. During this period, new verifications 
            will not be assigned to you.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4">
          <div className="rounded-lg border p-4 space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Start Date</span>
              <span className="text-sm font-medium">{leaveStart}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">End Date</span>
              <span className="text-sm font-medium">{leaveEnd}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Leave
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
