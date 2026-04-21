/**
 * ConfirmRegenerateDialog — Reusable confirmation dialog shown before any
 * action that regenerates the UNIFIED_SPA from SOURCE_DOC rows (Consolidate,
 * Enhance with AI, Re-run, Re-organize).
 *
 * The dialog is skipped when there is no draft yet (skipConfirm=true), and
 * the body copy adapts to whether the editor has unsaved manual edits
 * (isDirty) so we don't fatigue the user with the same warning on every run.
 */
import { type ReactElement, cloneElement, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ConfirmRegenerateDialogProps {
  trigger: ReactElement<{ onClick?: (e: React.MouseEvent) => void; disabled?: boolean }>;
  onConfirm: () => void;
  /** True when there is no existing draft to discard — dialog is bypassed. */
  skipConfirm?: boolean;
  /** True when the editor has unsaved edits since the last server load. */
  isDirty?: boolean;
  /** Disables the trigger entirely. */
  disabled?: boolean;
  confirmLabel?: string;
}

export function ConfirmRegenerateDialog({
  trigger,
  onConfirm,
  skipConfirm = false,
  isDirty = false,
  disabled = false,
  confirmLabel = 'Regenerate',
}: ConfirmRegenerateDialogProps) {
  const [open, setOpen] = useState(false);

  const handleTriggerClick = (e: React.MouseEvent) => {
    if (disabled) return;
    if (skipConfirm) {
      onConfirm();
      return;
    }
    e.preventDefault();
    setOpen(true);
  };

  const wrappedTrigger = cloneElement(trigger, {
    onClick: handleTriggerClick,
    disabled,
  });

  return (
    <>
      {wrappedTrigger}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Replace current draft?</AlertDialogTitle>
            <AlertDialogDescription>
              {isDirty
                ? 'This will regenerate the agreement from your uploaded source documents. Any manual edits in the editor will be discarded.'
                : 'Regenerate the agreement from the latest source documents?'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'destructive' }))}
              onClick={() => {
                setOpen(false);
                onConfirm();
              }}
            >
              {confirmLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ConfirmRegenerateDialog;
