import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useReturnForCorrection } from '@/hooks/queries/useSeekerOrgApprovals';

const correctionSchema = z.object({
  instructions: z.string().trim()
    .min(50, 'Instructions must be at least 50 characters')
    .max(1000, 'Instructions must be 1000 characters or less'),
});

type CorrectionValues = z.infer<typeof correctionSchema>;

interface ReturnForCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orgId: string;
  correctionCount: number;
}

export function ReturnForCorrectionDialog({ open, onOpenChange, orgId, correctionCount }: ReturnForCorrectionDialogProps) {
  const returnForCorrection = useReturnForCorrection();
  const isFinalReturn = correctionCount >= 1;

  const form = useForm<CorrectionValues>({
    resolver: zodResolver(correctionSchema),
    defaultValues: { instructions: '' },
  });

  const onSubmit = (data: CorrectionValues) => {
    returnForCorrection.mutate({ orgId, instructions: data.instructions }, {
      onSuccess: () => {
        form.reset();
        onOpenChange(false);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Return for Correction</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4">
            {isFinalReturn && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-amber-800 dark:text-amber-200">This is the final correction cycle</p>
                  <p className="text-amber-700 dark:text-amber-300 text-xs mt-0.5">
                    After this return, you must either approve or reject the organization. No further corrections allowed.
                  </p>
                </div>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Correction cycle: {correctionCount + 1} of 2
            </p>
            <div>
              <Label htmlFor="correction-instructions">Correction Instructions *</Label>
              <Textarea
                id="correction-instructions"
                {...form.register('instructions')}
                placeholder="Describe what needs to be corrected (min 50 characters)..."
                className="mt-2"
                rows={6}
              />
              {form.formState.errors.instructions && (
                <p className="text-xs text-destructive mt-1">{form.formState.errors.instructions.message}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={returnForCorrection.isPending}>
              {returnForCorrection.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Return for Correction
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
