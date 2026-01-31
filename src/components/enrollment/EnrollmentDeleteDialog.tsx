/**
 * Enhanced Enrollment Delete Dialog
 * 
 * Displays comprehensive validation information including:
 * - Hard blockers (cannot delete)
 * - Soft blockers (can force delete)
 * - Affected data summary
 * - Stakeholder notifications list
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  AlertTriangle,
  Ban,
  Loader2,
  Trash2,
  Mail,
  User,
  FileText,
  Calendar,
  GraduationCap,
  Layers,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  validateEnrollmentDeletion,
  executeEnrollmentDeletion,
  type DeletionValidationResult,
  type DeletionBlocker,
  type Stakeholder,
} from '@/services/enrollmentDeletionService';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';

interface EnrollmentDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enrollmentId: string | null;
  industryName: string | null;
  onDeleted?: () => void;
}

export function EnrollmentDeleteDialog({
  open,
  onOpenChange,
  enrollmentId,
  industryName,
  onDeleted,
}: EnrollmentDeleteDialogProps) {
  const [isValidating, setIsValidating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validation, setValidation] = useState<DeletionValidationResult | null>(null);
  const [forceDeleteConfirmed, setForceDeleteConfirmed] = useState(false);

  // Validate when dialog opens
  useEffect(() => {
    if (open && enrollmentId) {
      setIsValidating(true);
      setValidation(null);
      setForceDeleteConfirmed(false);

      validateEnrollmentDeletion(enrollmentId)
        .then(result => {
          setValidation(result);
        })
        .catch(error => {
          handleMutationError(error, { operation: 'validate_enrollment_deletion' });
        })
        .finally(() => {
          setIsValidating(false);
        });
    }
  }, [open, enrollmentId]);

  const handleDelete = async (isForceDelete: boolean = false) => {
    if (!enrollmentId) return;

    setIsDeleting(true);
    try {
      const result = await executeEnrollmentDeletion(enrollmentId, isForceDelete);

      if (result.success) {
        toast.success(
          isForceDelete
            ? `Enrollment deleted. ${validation?.stakeholders.length || 0} stakeholder(s) will be notified.`
            : 'Enrollment deleted successfully'
        );
        onDeleted?.();
        onOpenChange(false);
      } else {
        toast.error(result.error || 'Failed to delete enrollment');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const renderBlockerIcon = (blocker: DeletionBlocker) => {
    switch (blocker.code) {
      case 'ERR_PRIMARY':
        return <Ban className="h-4 w-4" />;
      case 'ERR_ONLY':
        return <Layers className="h-4 w-4" />;
      case 'ERR_CERTIFIED':
        return <ShieldAlert className="h-4 w-4" />;
      case 'WARN_ASSESSMENT':
        return <GraduationCap className="h-4 w-4" />;
      case 'WARN_APPROVAL':
        return <User className="h-4 w-4" />;
      case 'WARN_INTERVIEW':
        return <Calendar className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const renderStakeholderIcon = (stakeholder: Stakeholder) => {
    switch (stakeholder.type) {
      case 'reviewer':
        return <GraduationCap className="h-3 w-3" />;
      case 'manager':
        return <User className="h-3 w-3" />;
      default:
        return <Mail className="h-3 w-3" />;
    }
  };

  // Loading state
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

  // Hard blocked state
  if (validation?.hardBlockers && validation.hardBlockers.length > 0) {
    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Cannot Delete Enrollment
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Your enrollment in <span className="font-semibold">{industryName}</span> cannot be deleted due to the following:
                </p>

                <div className="space-y-3">
                  {validation.hardBlockers.map((blocker, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                    >
                      <div className="flex items-center gap-2 text-destructive font-medium text-sm mb-1">
                        {renderBlockerIcon(blocker)}
                        {blocker.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{blocker.message}</p>
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        💡 {blocker.resolution}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Force delete required state (soft blockers)
  if (validation?.softBlockers && validation.softBlockers.length > 0) {
    const { affectedData, stakeholders } = validation;

    return (
      <AlertDialog open={open} onOpenChange={onOpenChange}>
        <AlertDialogContent className="max-w-lg max-h-[90vh]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Force Delete Required
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4">
                <p>
                  Your enrollment in <span className="font-semibold">{industryName}</span> has active dependencies that will be affected.
                </p>

                {/* Soft Blockers */}
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-foreground">Active Dependencies</h4>
                  {validation.softBlockers.map((blocker, index) => (
                    <div
                      key={index}
                      className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                    >
                      <div className="flex items-center gap-2 text-amber-700 font-medium text-sm mb-1">
                        {renderBlockerIcon(blocker)}
                        {blocker.title}
                      </div>
                      <p className="text-sm text-muted-foreground">{blocker.message}</p>
                      <p className="text-xs text-amber-600 mt-1">{blocker.resolution}</p>
                    </div>
                  ))}
                </div>

                <Separator />

                {/* Affected Data */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Data to be Deleted</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {affectedData.proofPointsCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {affectedData.proofPointsCount} Proof Point{affectedData.proofPointsCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {affectedData.proficiencyAreasCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Layers className="h-3 w-3" />
                        {affectedData.proficiencyAreasCount} Proficiency Area{affectedData.proficiencyAreasCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {affectedData.specialitiesCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-3 w-3" />
                        {affectedData.specialitiesCount} Specialit{affectedData.specialitiesCount !== 1 ? 'ies' : 'y'}
                      </div>
                    )}
                    {affectedData.assessmentAttemptsCount > 0 && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle2 className="h-3 w-3" />
                        {affectedData.assessmentAttemptsCount} Assessment{affectedData.assessmentAttemptsCount !== 1 ? 's' : ''}
                      </div>
                    )}
                    {affectedData.interviewBookingsCount > 0 && (
                      <div className="flex items-center gap-2 text-destructive">
                        <Calendar className="h-3 w-3" />
                        {affectedData.interviewBookingsCount} Interview{affectedData.interviewBookingsCount !== 1 ? 's' : ''} (will be cancelled)
                      </div>
                    )}
                  </div>
                </div>

                {/* Stakeholders to Notify */}
                {stakeholders.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        People to be Notified ({stakeholders.length})
                      </h4>
                      <ScrollArea className="max-h-32">
                        <div className="space-y-2">
                          {stakeholders.map((stakeholder, index) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 text-sm p-2 rounded bg-muted/50"
                            >
                              <Badge variant="outline" className="shrink-0 gap-1 text-xs">
                                {renderStakeholderIcon(stakeholder)}
                                {stakeholder.type}
                              </Badge>
                              <div className="min-w-0">
                                <p className="font-medium truncate">{stakeholder.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{stakeholder.email}</p>
                                <p className="text-xs text-muted-foreground">{stakeholder.context}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </>
                )}

                <Separator />

                {/* Force Delete Confirmation */}
                <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                  <Checkbox
                    id="force-confirm"
                    checked={forceDeleteConfirmed}
                    onCheckedChange={(checked) => setForceDeleteConfirmed(checked === true)}
                  />
                  <label
                    htmlFor="force-confirm"
                    className="text-sm text-muted-foreground cursor-pointer leading-tight"
                  >
                    I understand this will permanently delete all data and notify {stakeholders.length} stakeholder{stakeholders.length !== 1 ? 's' : ''}. This action cannot be undone.
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!forceDeleteConfirmed || isDeleting}
              onClick={() => handleDelete(true)}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Force Delete
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Normal delete (no blockers)
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Industry Enrollment?
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                You are about to permanently delete your enrollment in{' '}
                <span className="font-semibold">{industryName}</span>.
              </p>

              {validation?.affectedData && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 space-y-2">
                  <p className="font-medium text-destructive text-sm">This will permanently delete:</p>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      All expertise selections for this industry
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {validation.affectedData.proficiencyAreasCount} proficiency area{validation.affectedData.proficiencyAreasCount !== 1 ? 's' : ''}
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                      {validation.affectedData.specialitiesCount} specialit{validation.affectedData.specialitiesCount !== 1 ? 'ies' : 'y'}
                    </li>
                    {validation.affectedData.proofPointsCount > 0 && (
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                        <span className="font-medium text-destructive">
                          {validation.affectedData.proofPointsCount} proof point{validation.affectedData.proofPointsCount !== 1 ? 's' : ''}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <p className="text-sm text-muted-foreground">
                This action cannot be undone.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isDeleting}
            onClick={(e) => {
              e.preventDefault();
              handleDelete(false);
            }}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Enrollment'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
