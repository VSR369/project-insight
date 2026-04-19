/**
 * RequestRecurationModal — Dialog for the Creator to request re-curation.
 * Form uses RHF + Zod; reason is required (≥10 chars).
 */
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
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
import { Label } from '@/components/ui/label';

const MIN_REASON = 10;

const schema = z.object({
  reason: z
    .string()
    .trim()
    .min(MIN_REASON, `Please provide at least ${MIN_REASON} characters`),
});

type FormValues = z.infer<typeof schema>;

export interface RequestRecurationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (reason: string) => void;
  isSubmitting?: boolean;
}

export function RequestRecurationModal({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: RequestRecurationModalProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '' },
  });

  const reason = form.watch('reason') ?? '';
  const charCount = reason.length;

  const handleFormSubmit = (values: FormValues) => {
    onSubmit(values.reason.trim());
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Request Re-curation</DialogTitle>
          <DialogDescription>
            Explain what needs to change. The Curator will review your feedback.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              placeholder="Describe what needs to be changed and why..."
              rows={5}
              {...form.register('reason')}
              disabled={isSubmitting}
              className="text-base"
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-destructive">
                {form.formState.errors.reason?.message ?? ''}
              </span>
              <span
                className={
                  charCount < MIN_REASON ? 'text-muted-foreground' : 'text-emerald-600'
                }
              >
                {charCount} / {MIN_REASON} min
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || charCount < MIN_REASON}
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              Submit Request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default RequestRecurationModal;
