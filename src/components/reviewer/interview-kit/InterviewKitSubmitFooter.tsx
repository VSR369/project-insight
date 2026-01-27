/**
 * Interview Kit Submit Footer
 * Submit button with validation and PDF export
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileDown, Send, AlertCircle } from "lucide-react";
import type { InterviewScoreResult } from "@/services/interviewKitGenerationService";

interface InterviewKitSubmitFooterProps {
  score: InterviewScoreResult;
  onSubmit: () => void;
  onExportPdf: () => void;
  isSubmitting?: boolean;
  isSubmitted?: boolean;
}

export function InterviewKitSubmitFooter({
  score,
  onSubmit,
  onExportPdf,
  isSubmitting,
  isSubmitted,
}: InterviewKitSubmitFooterProps) {
  const { totalQuestions, ratedCount, unratedCount } = score;
  const allRated = unratedCount === 0 && totalQuestions > 0;
  const canSubmit = allRated && !isSubmitted;

  return (
    <Card className="border-border/50 bg-muted/30">
      <CardContent className="pt-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Validation Message */}
          <div className="flex-1">
            {!allRated ? (
              <Alert variant="default" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-700 dark:text-amber-400">
                  Complete all ratings to submit the interview evaluation.
                  <span className="font-medium ml-1">
                    {unratedCount} question{unratedCount !== 1 ? 's' : ''} remaining.
                  </span>
                </AlertDescription>
              </Alert>
            ) : isSubmitted ? (
              <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
                <AlertDescription className="text-green-700 dark:text-green-400">
                  ✓ Interview evaluation submitted successfully. You can now export the scorecard.
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-sm text-muted-foreground">
                All {totalQuestions} questions rated. Ready to submit.
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={onExportPdf}
              disabled={!isSubmitted}
            >
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
            
            <Button
              onClick={onSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Evaluation
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
