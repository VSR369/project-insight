/**
 * Assessment Tab Content
 * 
 * Displays the candidate's assessment results in read-only mode for reviewers.
 * Shows score summary, pass/fail status, and hierarchical breakdown.
 */

import { Loader2, FileQuestion, CheckCircle2, XCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ResultsSummaryHeader } from "@/components/assessment/ResultsSummaryHeader";
import { ResultsHierarchyTree } from "@/components/assessment/ResultsHierarchyTree";
import { useAssessmentResults } from "@/hooks/queries/useAssessmentResults";

interface AssessmentTabContentProps {
  enrollmentId: string;
}

/**
 * Hook to fetch the latest submitted assessment attempt for an enrollment
 */
function useEnrollmentLatestAttempt(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment-latest-attempt', enrollmentId],
    queryFn: async () => {
      if (!enrollmentId) return null;

      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('id, submitted_at, is_passed, score_percentage, total_questions, answered_questions')
        .eq('enrollment_id', enrollmentId)
        .not('submitted_at', 'is', null) // Only completed attempts
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!enrollmentId,
  });
}

export function AssessmentTabContent({ enrollmentId }: AssessmentTabContentProps) {
  // Step 1: Get the latest attempt for this enrollment
  const { 
    data: latestAttempt, 
    isLoading: isLoadingAttempt, 
    error: attemptError 
  } = useEnrollmentLatestAttempt(enrollmentId);

  // Step 2: If we have an attempt, fetch full results
  const { 
    data: results, 
    isLoading: isLoadingResults, 
    error: resultsError 
  } = useAssessmentResults(latestAttempt?.id);

  // Loading state
  if (isLoadingAttempt || (latestAttempt && isLoadingResults)) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (attemptError || resultsError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load assessment results: {(attemptError || resultsError)?.message}
        </AlertDescription>
      </Alert>
    );
  }

  // No assessment yet
  if (!latestAttempt) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            No Assessment Completed
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            The provider has not completed their assessment yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // No results data (shouldn't happen if attempt exists, but handle gracefully)
  if (!results) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <FileQuestion className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            Assessment Data Unavailable
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Unable to load the assessment details.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate values for ResultsSummaryHeader
  const totalQuestions = results.attempt.totalQuestions;
  const scorePercentage = results.attempt.scorePercentage ?? 0;
  const isPassed = results.attempt.isPassed ?? false;
  
  // Calculate correct questions from hierarchy or use approximation
  const correctQuestions = Math.round((scorePercentage / 100) * totalQuestions);
  
  // Convert percentage to 1-5 rating (0-100% → 1-5)
  const overallRating = 1 + (scorePercentage / 100) * 4;

  const providerName = results.provider 
    ? `${results.provider.firstName} ${results.provider.lastName}`.trim() 
    : '—';
  const industrySegment = results.enrollment?.industrySegmentName ?? '—';
  const expertiseLevel = results.enrollment?.expertiseLevelName ?? '—';

  return (
    <div className="space-y-6">
      {/* Pass/Fail Status Banner */}
      <Card className={isPassed 
        ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800" 
        : "border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800"
      }>
        <CardContent className="flex items-center gap-4 py-4">
          {isPassed ? (
            <>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-green-800 dark:text-green-200">
                  Assessment Passed
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Provider met the passing threshold and is eligible for interview scheduling.
                </p>
              </div>
              <Badge className="ml-auto bg-green-600 text-white">PASSED</Badge>
            </>
          ) : (
            <>
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800 dark:text-red-200">
                  Assessment Not Passed
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300">
                  Provider did not meet the passing threshold. They may be eligible for a retake.
                </p>
              </div>
              <Badge variant="destructive" className="ml-auto">BELOW THRESHOLD</Badge>
            </>
          )}
        </CardContent>
      </Card>

      {/* Summary Header with KPIs */}
      <ResultsSummaryHeader
        providerName={providerName}
        industrySegment={industrySegment}
        expertiseLevel={expertiseLevel}
        totalQuestions={totalQuestions}
        correctQuestions={correctQuestions}
        scorePercentage={scorePercentage}
        overallRating={overallRating}
        isPassed={isPassed}
      />

      {/* Submission Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Submission Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Submitted:</span>
              <span className="ml-2 font-medium">
                {results.attempt.submittedAt 
                  ? new Date(results.attempt.submittedAt).toLocaleString()
                  : '—'}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Time Limit:</span>
              <span className="ml-2 font-medium">{results.attempt.timeLimitMinutes} minutes</span>
            </div>
            <div>
              <span className="text-muted-foreground">Questions Answered:</span>
              <span className="ml-2 font-medium">
                {results.attempt.answeredQuestions ?? 0} / {totalQuestions}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hierarchical Results Breakdown */}
      <ResultsHierarchyTree 
        hierarchy={results.hierarchy} 
        showQuestions={true} 
      />
    </div>
  );
}
