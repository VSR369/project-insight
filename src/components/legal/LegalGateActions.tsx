/**
 * LegalGateActions — Checkbox + Accept/Decline buttons for legal gate modal.
 * Accept is disabled until both scroll ≥90% AND checkbox is checked.
 */
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface LegalGateActionsProps {
  scrollProgress: number;
  isChecked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onAccept: () => void;
  onDecline: () => void;
  isSubmitting: boolean;
  documentName: string;
}

const SCROLL_THRESHOLD = 90;

export function LegalGateActions({
  scrollProgress,
  isChecked,
  onCheckedChange,
  onAccept,
  onDecline,
  isSubmitting,
  documentName,
}: LegalGateActionsProps) {
  const scrollMet = scrollProgress >= SCROLL_THRESHOLD;
  const canAccept = scrollMet && isChecked && !isSubmitting;

  return (
    <div className="space-y-3 border-t pt-4">
      {!scrollMet && (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">
            Please scroll to read the entire document ({scrollProgress}%)
          </p>
          <Progress value={scrollProgress} className="h-1.5" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <Checkbox
          id="legal-accept-checkbox"
          checked={isChecked}
          onCheckedChange={(v) => onCheckedChange(v === true)}
          disabled={!scrollMet || isSubmitting}
          className="mt-0.5"
        />
        <label
          htmlFor="legal-accept-checkbox"
          className="text-sm leading-snug cursor-pointer select-none"
        >
          I have read and accept the terms and conditions of the{' '}
          <span className="font-medium">{documentName}</span>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <Button
          variant="outline"
          onClick={onDecline}
          disabled={isSubmitting}
          className="min-w-[100px]"
        >
          Decline
        </Button>
        <Button
          onClick={onAccept}
          disabled={!canAccept}
          className="min-w-[100px]"
        >
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept
        </Button>
      </div>
    </div>
  );
}
