import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRejectBilling } from '@/hooks/queries/useSeekerOrgApprovals';

const billingRejectionSchema = z.object({
  reason: z.string().trim().min(1, 'Rejection reason is required').max(500, 'Reason must be 500 characters or less'),
});

type BillingRejectionValues = z.infer<typeof billingRejectionSchema>;

interface RejectBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billingId: string;
}

export function RejectBillingDialog({ open, onOpenChange, billingId }: RejectBillingDialogProps) {
  const rejectBilling = useRejectBilling();

  const form = useForm<BillingRejectionValues>({
    resolver: zodResolver(billingRejectionSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = (data: BillingRejectionValues) => {
    rejectBilling.mutate({ billingId, reason: data.reason }, {
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
          <DialogTitle>Reject Billing Payment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="py-4">
            <Label htmlFor="billing-rejection-reason">Rejection Reason</Label>
            <Textarea
              id="billing-rejection-reason"
              {...form.register('reason')}
              placeholder="Explain why the billing/payment is being rejected..."
              className="mt-2"
              rows={4}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={rejectBilling.isPending}>
              {rejectBilling.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Reject Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
