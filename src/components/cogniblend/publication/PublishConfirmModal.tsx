/**
 * PublishConfirmModal — Confirmation dialog before publishing a challenge.
 */

import { Loader2, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';

interface PublishConfirmModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function PublishConfirmModal({ open, onOpenChange, onConfirm, isPending }: PublishConfirmModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-foreground flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Publish Challenge
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-muted-foreground">
              <p>Publishing this challenge will:</p>
              <ol className="list-decimal list-inside space-y-1.5 text-[13px]">
                <li>Make it visible to solvers based on your Visibility settings.</li>
                <li>Lock the operating model permanently.</li>
                <li>Begin the solver submission period.</li>
              </ol>
              <p className="font-medium text-foreground text-[13px]">Are you sure?</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Rocket className="h-4 w-4 mr-1" />
            )}
            Publish Now
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
