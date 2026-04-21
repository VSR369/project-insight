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

export type ConfirmRegenerateMode = 'pass3' | 'organize';

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
  /** Which operation will be confirmed — drives title + body copy. */
  mode?: ConfirmRegenerateMode;
}

const COPY: Record<
  ConfirmRegenerateMode,
  { title: string; bodyDirty: string; bodyClean: string; confirm: string }
> = {
  pass3: {
    title: 'Re-run AI Pass 3?',
    bodyDirty:
      'Re-running Pass 3 will replace the agreement with a freshly AI-generated version that merges, enhances and rewrites clauses in legal voice. Any manual edits in the editor will be discarded.',
    bodyClean:
      'Re-run Pass 3 to regenerate the agreement with the AI merging, enhancing and rewriting clauses from your source documents and challenge context.',
    confirm: 'Re-run Pass 3',
  },
  organize: {
    title: 'Organize & Merge?',
    bodyDirty:
      'Organize & Merge will rebuild the agreement verbatim from your uploaded source documents — no AI rewriting. Any manual edits in the editor will be discarded.',
    bodyClean:
      'Organize & Merge will deduplicate and harmonise clauses from your uploaded source documents into the agreement, verbatim — no AI rewriting.',
    confirm: 'Organize & Merge',
  },
};

export function ConfirmRegenerateDialog({
  trigger,
  onConfirm,
  skipConfirm = false,
  isDirty = false,
  disabled = false,
  confirmLabel,
  mode = 'pass3',
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
            <AlertDialogTitle>{COPY[mode].title}</AlertDialogTitle>
            <AlertDialogDescription>
              {isDirty ? COPY[mode].bodyDirty : COPY[mode].bodyClean}
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
              {confirmLabel ?? COPY[mode].confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ConfirmRegenerateDialog;
