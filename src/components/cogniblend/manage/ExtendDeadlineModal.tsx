/** Curator-only bounded deadline extension; the server is authoritative. */
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarClock, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useConfigNumber } from '@/hooks/queries/useMpaConfig';
import { useExtendChallengeDeadline } from '@/hooks/queries/useExtendChallengeDeadline';
import {
  formatDeadline,
  fromUtcInput,
  validateExtension,
} from '@/services/cogniblend/lifecycle/stageDeadlines';

interface ExtendDeadlineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  stageCount: 1 | 2;
  abstractDeadline: string | null;
  solutionDeadline: string | null;
}

const baseSchema = z.object({
  which: z.enum(['abstract', 'solution']),
  newDeadline: z.string().min(1, 'Choose a new deadline.'),
  reason: z.string().trim().max(500, 'Keep the reason under 500 characters.'),
});
type FormValues = z.infer<typeof baseSchema>;

function createSchema(minReason: number, maxDays: number, abstract: string | null, solution: string | null) {
  return baseSchema.extend({ reason: z.string().trim().min(minReason, `Give at least ${minReason} characters.`).max(500) })
    .superRefine((values, ctx) => {
      const currentText = values.which === 'abstract' ? abstract : solution;
      const proposed = fromUtcInput(values.newDeadline);
      if (!currentText || !proposed) return;
      const problem = validateExtension(new Date(currentText), proposed, maxDays);
      if (problem) ctx.addIssue({ code: 'custom', path: ['newDeadline'], message: problem });
      if (values.which === 'abstract' && solution && proposed >= new Date(solution)) {
        ctx.addIssue({ code: 'custom', path: ['newDeadline'], message: 'The abstract deadline must stay before the solution deadline.' });
      }
    });
}

export function ExtendDeadlineModal({
  open,
  onOpenChange,
  challengeId,
  stageCount,
  abstractDeadline,
  solutionDeadline,
}: ExtendDeadlineModalProps) {
  const minReason = useConfigNumber('deadline_extension_reason_min_length');
  const maxDays = useConfigNumber('deadline_max_extension_days');
  const form = useForm<FormValues>({
    resolver: zodResolver(createSchema(minReason, maxDays, abstractDeadline, solutionDeadline)),
    defaultValues: { which: 'solution', newDeadline: '', reason: '' },
  });
  const extendMutation = useExtendChallengeDeadline();
  useEffect(() => {
    if (open) form.reset({ which: 'solution', newDeadline: '', reason: '' });
  }, [open, form]);

  const values = form.watch();
  const currentText = values.which === 'abstract' ? abstractDeadline : solutionDeadline;
  const proposed = fromUtcInput(values.newDeadline);
  const handleSubmit = form.handleSubmit((input) => {
    const newDeadline = fromUtcInput(input.newDeadline);
    if (!newDeadline) return;
    extendMutation.mutate(
      { challengeId, which: input.which, newDeadline, reason: input.reason.trim() },
      { onSuccess: () => onOpenChange(false) },
    );
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarClock className="h-4 w-4" /> Extend challenge deadline
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="extend-which">Deadline</Label>
            <select
              id="extend-which"
              className="flex h-11 w-full rounded-md border border-input bg-background px-3 text-base"
              {...form.register('which')}
            >
              <option value="solution">Solution deadline</option>
              {stageCount === 2 && <option value="abstract">Abstract deadline</option>}
            </select>
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <span className="text-muted-foreground">Current: </span>
            {currentText ? formatDeadline(new Date(currentText)) : 'No deadline is set.'}
          </div>
          <div className="space-y-2">
            <Label htmlFor="extend-new-deadline">New deadline (UTC)</Label>
            <Input id="extend-new-deadline" type="datetime-local" className="text-base" {...form.register('newDeadline')} />
            {proposed && <p className="text-xs text-muted-foreground">{formatDeadline(proposed)}</p>}
            {form.formState.errors.newDeadline && (
              <p role="alert" className="text-xs text-destructive">{form.formState.errors.newDeadline.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="extend-reason">Written reason</Label>
            <Textarea
              id="extend-reason"
              rows={4}
              maxLength={500}
              className="text-base"
              placeholder={`Explain the extension in at least ${minReason} characters.`}
              {...form.register('reason')}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{values.reason.trim().length} / {minReason} minimum</span>
              <span>{values.reason.length} / 500</span>
            </div>
            {form.formState.errors.reason && (
              <p role="alert" className="text-xs text-destructive">{form.formState.errors.reason.message}</p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Deadlines can only move later, by at most {maxDays} days. The server audits the reason and notifies affected Solution Providers.
          </p>
          <DialogFooter className="shrink-0 gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="min-h-11" disabled={!currentText || extendMutation.isPending}>
              {extendMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Extend and notify
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
