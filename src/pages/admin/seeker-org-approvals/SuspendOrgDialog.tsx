import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useSuspendOrg } from '@/hooks/queries/useSeekerOrgApprovals';

const suspendSchema = z.object({
  reason: z.string().trim().min(50, 'Suspension reason must be at least 50 characters').max(500),
});

type SuspendValues = z.infer<typeof suspendSchema>;

interface SuspendOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function SuspendOrgDialog({ open, onOpenChange, orgId }: SuspendOrgDialogProps) {
  const suspendOrg = useSuspendOrg();

  const form = useForm<SuspendValues>({
    resolver: zodResolver(suspendSchema),
    defaultValues: { reason: '' },
  });

  const onSubmit = (data: SuspendValues) => {
    suspendOrg.mutate({ orgId, reason: data.reason }, {
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
          <DialogTitle>Suspend Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="py-4">
            <Label htmlFor="suspension-reason">Suspension Reason *</Label>
            <Textarea
              id="suspension-reason"
              {...form.register('reason')}
              placeholder="Explain the reason for suspension (min 50 characters)..."
              className="mt-2"
              rows={4}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" variant="destructive" disabled={suspendOrg.isPending}>
              {suspendOrg.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Suspend
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
