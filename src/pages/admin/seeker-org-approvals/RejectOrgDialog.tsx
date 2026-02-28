import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRejectOrg } from '@/hooks/queries/useSeekerOrgApprovals';

interface RejectOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function RejectOrgDialog({ open, onOpenChange, orgId }: RejectOrgDialogProps) {
  const [reason, setReason] = useState('');
  const rejectOrg = useRejectOrg();

  const handleReject = () => {
    rejectOrg.mutate({ orgId, reason }, {
      onSuccess: () => {
        setReason('');
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Reject Organization</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="rejection-reason">Rejection Reason</Label>
          <Textarea
            id="rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Provide a reason for rejection..."
            className="mt-2"
            rows={4}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || rejectOrg.isPending}
          >
            {rejectOrg.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
