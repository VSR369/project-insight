/**
 * EnrollmentDeleteDialog — Orchestrates enrollment deletion with validation.
 * Uses sub-components: BlockersList, AffectedDataSummary, StakeholderNotifications.
 */

import { useState, useEffect } from 'react';
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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Loader2, Trash2, XCircle, AlertTriangle } from 'lucide-react';
import {
  validateEnrollmentDeletion,
  executeEnrollmentDeletion,
  type DeletionValidationResult,
} from '@/services/enrollmentDeletionService';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import { BlockersList } from './deletion/BlockersList';
import { AffectedDataSummary } from './deletion/AffectedDataSummary';
import { StakeholderNotifications } from './deletion/StakeholderNotifications';

interface EnrollmentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string | null;
  industryName: string | null;
  onDeleted?: () => void;
}

export function EnrollmentDeleteDialog({
  open, onOpenChange, enrollmentId, industryName, onDeleted,
}: EnrollmentDeleteDialogProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validation, setValidation] = useState<DeletionValidationResult | null>(null);
  const [forceDeleteConfirmed, setForceDeleteConfirmed] = useState(false);

  useEffect(() => {
    if (open && enrollmentId) {
      setIsValidating(true);
      setValidation(null);
      setForceDeleteConfirmed(false);
      validateEnrollmentDeletion(enrollmentId)
        .then(setValidation)
        .catch(error => handleMutationError(error, { operation: 'validate_enrollment_deletion' }))
        .finally(() => setIsValidating(false));
    }
  }, [open, enrollmentId]);

  const handleDelete = async (isForceDelete: boolean = false) => {
    if (!enrollmentId) return;
    setIsDeleting(true);
    try {
      const result = await executeEnrollmentDeletion(enrollmentId, isForceDelete);
      if (result.success) {
        toast.success(isForceDelete
          ? `Enrollment deleted. ${validation?.stakeholders.length || 0} stakeholder(s) will be notified.`
          : 'Enrollment deleted successfully');
        onDeleted?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to delete enrollment');
      }
    } catch {
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isValidating) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Validating deletion...</p>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Hard blocked
  if (validation?.hardBlockers?.length) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> Cannot Delete Enrollment
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Your enrollment in <span className="font-semibold">{industryName}</span> cannot be deleted:</p>
                <BlockersList blockers={validation.hardBlockers} variant="hard" />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Close</AlertDialogCancel></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Soft blockers — force delete
  if (validation?.softBlockers?.length) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-lg max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Force Delete Required
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>Your enrollment in <span className="font-semibold">{industryName}</span> has active dependencies.</p>
                <BlockersList blockers={validation.softBlockers} variant="soft" />
                <Separator />
                <AffectedDataSummary data={validation.affectedData} />
                {validation.stakeholders.length > 0 && (
                  <><Separator /><StakeholderNotifications stakeholders={validation.stakeholders} /></>
                )}
                <Separator />
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <Checkbox id="force-confirm" checked={forceDeleteConfirmed} onCheckedChange={(c) => setForceDeleteConfirmed(c === true)} />
                  <label htmlFor="force-confirm" className="text-sm text-muted-foreground cursor-pointer leading-tight">
                    I understand this will permanently delete all data and notify {validation.stakeholders.length} stakeholder(s). This cannot be undone.
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button variant="destructive" disabled={!forceDeleteConfirmed || isDeleting} onClick={() => handleDelete(true)}>
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" />Force Delete</>}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Normal delete
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" /> Delete Industry Enrollment?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>You are about to permanently delete your enrollment in <span className="font-semibold">{industryName}</span>.</p>
              {validation?.affectedData && <AffectedDataSummary data={validation.affectedData} />}
              <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={isDeleting} onClick={(e) => { e.preventDefault(); handleDelete(false); }}>
            {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : 'Delete Enrollment'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
