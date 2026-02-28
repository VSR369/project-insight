import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useRejectDocument } from '@/hooks/queries/useSeekerOrgApprovals';

interface RejectDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
}

export function RejectDocumentDialog({ open, onOpenChange, docId }: RejectDocumentDialogProps) {
  const [reason, setReason] = useState('');
  const rejectDoc = useRejectDocument();

  const handleReject = () => {
    rejectDoc.mutate({ docId, reason }, {
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
          <DialogTitle>Reject Document</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="doc-rejection-reason">Rejection Reason</Label>
          <Textarea
            id="doc-rejection-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this document rejected?"
            className="mt-2"
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={!reason.trim() || rejectDoc.isPending}
          >
            {rejectDoc.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
