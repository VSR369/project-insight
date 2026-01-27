import { Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ProofPointsReviewFooterProps {
  totalCount: number;
  ratedCount: number;
  allRated: boolean;
  reviewStatus: 'pending' | 'in_progress' | 'completed';
  finalScore: number;
  onSaveDraft: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  isConfirming: boolean;
  isInterviewSubmitted?: boolean;
}

export function ProofPointsReviewFooter({
  totalCount,
  ratedCount,
  allRated,
  reviewStatus,
  finalScore,
  onSaveDraft,
  onConfirm,
  isSaving,
  isConfirming,
  isInterviewSubmitted = false,
}: ProofPointsReviewFooterProps) {
  const isCompleted = reviewStatus === 'completed';
  const isLocked = isCompleted || isInterviewSubmitted;
  const unratedCount = totalCount - ratedCount;

  if (isLocked) {
    const message = isInterviewSubmitted && !isCompleted
      ? 'Interview has been submitted. Proof Points review can no longer be modified.'
      : `Proof Points review has been completed with a final score of ${finalScore.toFixed(2)}/10.`;
    
    return (
      <div className="sticky bottom-0 bg-background border-t p-4 mt-6">
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="sticky bottom-0 bg-background border-t p-4 mt-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {!allRated && totalCount > 0 && (
            <span className="text-amber-600">
              ⚠️ {unratedCount} proof point(s) still need ratings
            </span>
          )}
          {allRated && totalCount > 0 && (
            <span className="text-green-600">
              ✓ All proof points rated
            </span>
          )}
          {totalCount === 0 && (
            <span>No proof points to review</span>
          )}
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onSaveDraft}
            disabled={isSaving || isConfirming || totalCount === 0}
          >
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </>
            )}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                disabled={!allRated || isConfirming || isSaving || totalCount === 0}
              >
                {isConfirming ? 'Confirming...' : 'Confirm Proof Points Review'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Proof Points Review</AlertDialogTitle>
                <AlertDialogDescription>
                  You have rated all {totalCount} proof points with a calculated final score of{' '}
                  <strong>{finalScore.toFixed(2)}/10</strong>.
                  <br /><br />
                  This action will mark the proof points review as complete. Are you sure you want to proceed?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onConfirm}>
                  Confirm Review
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
}
