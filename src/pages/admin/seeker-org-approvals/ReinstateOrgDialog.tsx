import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useReinstateOrg } from '@/hooks/queries/useSeekerOrgApprovals';

const reinstateSchema = z.object({
  rationale: z.string().trim().min(10, 'Rationale is required').max(500),
});

type ReinstateValues = z.infer<typeof reinstateSchema>;

interface ReinstateOrgDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
}

export function ReinstateOrgDialog({ open, onOpenChange, orgId }: ReinstateOrgDialogProps) {
  const reinstateOrg = useReinstateOrg();

  const form = useForm<ReinstateValues>({
    resolver: zodResolver(reinstateSchema),
    defaultValues: { rationale: '' },
  });

  const onSubmit = (data: ReinstateValues) => {
    reinstateOrg.mutate({ orgId, rationale: data.rationale }, {
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
          <DialogTitle>Reinstate Organization</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="py-4">
            <Label htmlFor="reinstate-rationale">Rationale *</Label>
            <Textarea
              id="reinstate-rationale"
              {...form.register('rationale')}
              placeholder="Explain why the organization should be reinstated..."
              className="mt-2"
              rows={4}
            />
            {form.formState.errors.rationale && (
              <p className="text-xs text-destructive mt-1">{form.formState.errors.rationale.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={reinstateOrg.isPending}>
              {reinstateOrg.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Reinstate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
