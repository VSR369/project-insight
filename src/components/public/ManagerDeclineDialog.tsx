/**
 * ManagerDeclineDialog — Decline reason dialog extracted from ManagerApprovalDashboard.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

interface ManagerDeclineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  isProcessing: boolean;
  onDecline: (reason: string) => void;
}

export function ManagerDeclineDialog({ open, onOpenChange, providerName, isProcessing, onDecline }: ManagerDeclineDialogProps) {
  const [reason, setReason] = useState('');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decline Request</DialogTitle>
          <DialogDescription>
            Are you sure you want to decline {providerName}'s request? You can optionally provide a reason.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="declineReason">Reason (Optional)</Label>
          <Textarea
            id="declineReason"
            placeholder="e.g., Not authorized to represent this organization"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>Cancel</Button>
          <Button variant="destructive" onClick={() => onDecline(reason)} disabled={isProcessing}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Decline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
