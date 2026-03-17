/**
 * InitiateAmendmentModal — Modal for initiating a post-publication amendment.
 *
 * Captures scope areas, reason text, and material change flag.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { useInitiateAmendment } from '@/hooks/cogniblend/useAmendments';

/* ─── Types ──────────────────────────────────────────────── */

interface InitiateAmendmentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  challengeId: string;
  challengeTitle: string;
  userId: string;
}

/* ─── Constants ──────────────────────────────────────────── */

const SCOPE_OPTIONS = [
  { value: 'Content', label: 'Content' },
  { value: 'Timeline', label: 'Timeline' },
  { value: 'Reward', label: 'Reward' },
  { value: 'Legal Terms', label: 'Legal Terms' },
] as const;

const MIN_REASON_LENGTH = 10;

/* ─── Component ──────────────────────────────────────────── */

export function InitiateAmendmentModal({
  open,
  onOpenChange,
  challengeId,
  challengeTitle,
  userId,
}: InitiateAmendmentModalProps) {
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [reason, setReason] = useState('');
  const [isMaterial, setIsMaterial] = useState(false);
  const mutation = useInitiateAmendment();

  const reasonTooShort = reason.trim().length < MIN_REASON_LENGTH;
  const canSubmit = selectedScopes.length > 0 && !reasonTooShort && !mutation.isPending;

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  const handleSubmit = () => {
    mutation.mutate(
      {
        challengeId,
        challengeTitle,
        userId,
        scopes: selectedScopes,
        reason: reason.trim(),
        isMaterial,
      },
      {
        onSuccess: () => {
          setSelectedScopes([]);
          setReason('');
          setIsMaterial(false);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-base font-bold">Initiate Amendment</DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-5">
          {/* Scope checkboxes */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Amendment Scope <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {SCOPE_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border px-3 py-2.5 cursor-pointer text-sm transition-colors',
                    selectedScopes.includes(opt.value)
                      ? 'border-primary bg-primary/5 text-foreground'
                      : 'border-border bg-card text-muted-foreground hover:border-primary/40',
                  )}
                >
                  <Checkbox
                    checked={selectedScopes.includes(opt.value)}
                    onCheckedChange={() => toggleScope(opt.value)}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the reason for this amendment..."
              rows={4}
              maxLength={1000}
              className="text-sm resize-none"
            />
            <div className="flex items-center justify-between">
              <p
                className={cn(
                  'text-[10px]',
                  reasonTooShort ? 'text-destructive' : 'text-muted-foreground',
                )}
              >
                {reason.trim().length} / {MIN_REASON_LENGTH} min characters
              </p>
              <p className="text-[10px] text-muted-foreground">
                {reason.length} / 1000
              </p>
            </div>
          </div>

          {/* Material change toggle */}
          <label className="flex items-start gap-3 rounded-lg border border-[hsl(38,60%,70%)] bg-[hsl(38,60%,96%)] p-3 cursor-pointer">
            <Checkbox
              checked={isMaterial}
              onCheckedChange={(checked) => setIsMaterial(checked === true)}
              className="mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-foreground">
                This is a material change
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Material changes to reward, timeline, or scope grant enrolled solvers a 7-day withdrawal window without penalty.
              </p>
            </div>
          </label>
        </div>

        <DialogFooter className="shrink-0 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="bg-[hsl(38,70%,50%)] hover:bg-[hsl(38,70%,45%)] text-white"
          >
            {mutation.isPending && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            Submit Amendment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
