import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRejectDocument } from '@/hooks/queries/useSeekerOrgApprovals';

const rejectionSchema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required').max(500, 'Reason must be 500 characters or less'),
});

type RejectionValues = z.infer<typeof rejectionSchema>;

interface RejectDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  docId: string;
}

/** Dialog for rejecting a document with a mandatory reason (validated via Zod). */
export function RejectDocumentDialog({ open, onOpenChange, docId }: RejectDocumentDialogProps) {
  const rejectDoc = useRejectDocument();

  const form = useForm<RejectionValues>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = (data: RejectionValues) => {
    rejectDoc.mutate({ docId, reason: data.reason }, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Reject Document</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="py-4">
            <Label htmlFor="doc-rejection-reason">Rejection Reason</Label>
            <Textarea
              id="doc-rejection-reason"
              {...form.register('reason')}
              placeholder="Why is this document rejected?"
              className="mt-2"
              rows={3}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={rejectDoc.isPending}>
              {rejectDoc.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
