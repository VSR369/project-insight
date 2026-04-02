/**
 * ComplexityDialogs — Alert dialogs extracted from ComplexityAssessmentModule.
 * Handles: dirty-state confirmation, lock confirmation, solution type reset.
 */

import React from 'react';
import { Lock } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';

interface DirtyConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStay: () => void;
  onDiscard: () => void;
}

export function DirtyConfirmDialog({ open, onOpenChange, onStay, onDiscard }: DirtyConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
          <AlertDialogDescription>
            You have unsaved changes. Switching will discard them. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onStay}>Stay</AlertDialogCancel>
          <AlertDialogAction onClick={onDiscard}>Discard & Switch</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface LockConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLock: () => void;
}

export function LockConfirmDialog({ open, onOpenChange, onLock }: LockConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Lock Complexity Assessment?</AlertDialogTitle>
          <AlertDialogDescription>
            This will finalize the complexity assessment. All tabs will become read-only.
            The locked values will be used as the basis for downstream pricing and reward calculations.
            You can unlock it later if corrections are needed.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onLock}>
            <Lock className="h-3.5 w-3.5 mr-1" />Lock Assessment
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface SolutionTypeResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReset: () => void;
}

export function SolutionTypeResetDialog({ open, onOpenChange, onReset }: SolutionTypeResetDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Solution Type Changed</AlertDialogTitle>
          <AlertDialogDescription>
            The solution type has changed. Complexity dimensions are different for each solution type.
            Existing scores will be reset. Continue?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onOpenChange(false)}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onReset}>
            Reset Scores
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
