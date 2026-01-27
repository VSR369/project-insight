/**
 * Interview Kit Footer Component
 * Submit and Export actions
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/alert-dialog";
import { 
  Download, 
  Send, 
  AlertCircle, 
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import {
  RECOMMENDATION_CONFIG,
  RecommendationLevel,
} from "@/constants/interview-kit-scoring.constants";

interface InterviewKitFooterProps {
  totalQuestions: number;
  ratedQuestions: number;
  earnedPoints: number;
  maxPoints: number;
  percentage: number;
  recommendation: RecommendationLevel;
  isSubmitted: boolean;
  onSubmit: () => Promise<void>;
  onExportPdf: () => void;
  isSubmitting?: boolean;
}

export function InterviewKitFooter({
  totalQuestions,
  ratedQuestions,
  earnedPoints,
  maxPoints,
  percentage,
  recommendation,
  isSubmitted,
  onSubmit,
  onExportPdf,
  isSubmitting,
}: InterviewKitFooterProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  const allRated = ratedQuestions === totalQuestions;
  const canSubmit = allRated && !isSubmitted;
  const recConfig = RECOMMENDATION_CONFIG[recommendation];

  const handleSubmitClick = () => {
    if (!allRated) {
      toast.error("Please rate all questions before submitting the interview.");
      return;
    }
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    await onSubmit();
  };

  return (
    <>
      <Card className="border-border/50 sticky bottom-0 bg-background/95 backdrop-blur-sm">
        <CardContent className="p-4">
          {/* Validation Message */}
          {!allRated && !isSubmitted && (
            <Alert variant="destructive" className="mb-3">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Complete all ratings to export the final scorecard. 
                {totalQuestions - ratedQuestions} question{totalQuestions - ratedQuestions !== 1 ? 's' : ''} remaining.
              </AlertDescription>
            </Alert>
          )}

          {/* Submitted Message */}
          {isSubmitted && (
            <Alert className="mb-3 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Interview has been submitted. Final Score: {percentage.toFixed(1)}% — {recConfig.label}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm text-muted-foreground">
              {allRated ? (
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" />
                  All questions rated
                </span>
              ) : (
                <span>
                  {ratedQuestions}/{totalQuestions} questions rated
                </span>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={onExportPdf}
                disabled={!allRated || isSubmitting}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Export Scorecard PDF
              </Button>

              <Button
                onClick={handleSubmitClick}
                disabled={!canSubmit || isSubmitting}
                className="gap-2"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Submit Interview
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Interview Evaluation?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>You are about to submit the interview evaluation with the following results:</p>
              <div className="bg-muted p-3 rounded-md space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Total Score:</span>
                  <span className="font-medium">{earnedPoints}/{maxPoints} ({percentage.toFixed(1)}%)</span>
                </div>
                <div className="flex justify-between">
                  <span>Recommendation:</span>
                  <span className={`font-medium ${recConfig.color}`}>{recConfig.label}</span>
                </div>
              </div>
              <p className="text-amber-600 dark:text-amber-400">
                This action cannot be undone. The evaluation will be finalized.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSubmit}>
              Submit Interview
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
