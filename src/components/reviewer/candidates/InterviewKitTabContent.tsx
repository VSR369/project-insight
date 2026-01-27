/**
 * Interview Kit Tab Content
 * Main orchestrator component for the Interview Kit tab
 */

import { useState, useCallback, useRef } from "react";
import { Loader2, AlertCircle, ClipboardList } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InterviewKitHeader } from "./InterviewKitHeader";
import { InterviewKitScoringLogic } from "./InterviewKitScoringLogic";
import { InterviewQuestionSection } from "./InterviewQuestionSection";
import { InterviewKitReviewNotes } from "./InterviewKitReviewNotes";
import { InterviewKitFooter } from "./InterviewKitFooter";
import {
  useInterviewKitSession,
  useCreateEvaluation,
  useSaveQuestionResponse,
  useSubmitInterview,
} from "@/hooks/queries/useInterviewKitSession";
import { useUpdateCandidateReviewData } from "@/hooks/queries/useCandidateDetail";
import {
  InterviewRating,
  INTERVIEW_RATING_POINTS,
  getRecommendationLevel,
  RecommendationLevel,
} from "@/constants/interview-kit-scoring.constants";
import { toast } from "sonner";

interface InterviewKitTabContentProps {
  enrollmentId: string;
  bookingId: string | undefined;
  industrySegmentId: string;
  expertiseLevelId: string;
  flagForClarification?: boolean;
  clarificationNotes?: string | null;
  reviewerNotes?: string | null;
}

export function InterviewKitTabContent({
  enrollmentId,
  bookingId,
  industrySegmentId,
  expertiseLevelId,
  flagForClarification,
  clarificationNotes,
  reviewerNotes,
}: InterviewKitTabContentProps) {
  const [savingQuestionId, setSavingQuestionId] = useState<string | undefined>();
  const evaluationIdRef = useRef<string | null>(null);

  // Queries and mutations
  const {
    data: sessionData,
    isLoading,
    error,
    refetch,
  } = useInterviewKitSession(bookingId, enrollmentId, industrySegmentId, expertiseLevelId);

  const createEvaluation = useCreateEvaluation();
  const saveResponse = useSaveQuestionResponse();
  const submitInterview = useSubmitInterview();
  const { mutate: updateReviewData, isPending: isUpdatingReview } = useUpdateCandidateReviewData(enrollmentId);

  // Get or create evaluation
  const ensureEvaluation = useCallback(async (): Promise<string> => {
    if (evaluationIdRef.current) return evaluationIdRef.current;
    if (sessionData?.evaluation?.id) {
      evaluationIdRef.current = sessionData.evaluation.id;
      return sessionData.evaluation.id;
    }
    
    if (!bookingId) throw new Error("No booking ID");
    
    const evalId = await createEvaluation.mutateAsync(bookingId);
    evaluationIdRef.current = evalId;
    return evalId;
  }, [bookingId, sessionData?.evaluation?.id, createEvaluation]);

  // Handle rating change
  const handleRatingChange = useCallback(async (
    questionId: string,
    rating: InterviewRating,
    comments?: string
  ) => {
    if (!sessionData) return;

    setSavingQuestionId(questionId);
    
    try {
      const evaluationId = await ensureEvaluation();
      
      // Find the question
      const question = sessionData.questions.find(q => q.id === questionId) 
        || sessionData.generatedQuestions.find(q => q.id === questionId);
      
      if (!question) {
        throw new Error("Question not found");
      }

      await saveResponse.mutateAsync({
        evaluationId,
        question,
        rating,
        comments,
      });

      // Refetch to update stats
      refetch();
    } catch (err) {
      console.error("Failed to save rating:", err);
      toast.error("Failed to save rating");
    } finally {
      setSavingQuestionId(undefined);
    }
  }, [sessionData, ensureEvaluation, saveResponse, refetch]);

  // Handle submit
  const handleSubmit = useCallback(async () => {
    if (!sessionData || !bookingId) return;

    try {
      const evaluationId = await ensureEvaluation();
      
      await submitInterview.mutateAsync({
        evaluationId,
        bookingId,
        earnedPoints: sessionData.stats.earnedPoints,
        maxPoints: sessionData.stats.maxPoints,
        recommendation: sessionData.stats.recommendation,
      });
    } catch (err) {
      console.error("Failed to submit interview:", err);
    }
  }, [sessionData, bookingId, ensureEvaluation, submitInterview]);

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    // Dynamic import to avoid loading html2pdf.js until needed
    const html2pdf = (await import('html2pdf.js')).default;
    
    const content = document.getElementById('interview-kit-content');
    if (!content) {
      toast.error("Unable to generate PDF");
      return;
    }

    const opt = {
      margin: 10,
      filename: `interview-scorecard-${enrollmentId}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    };

    toast.info("Generating PDF...");
    
    try {
      await html2pdf().set(opt).from(content).save();
      toast.success("PDF exported successfully");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to export PDF");
    }
  }, [enrollmentId]);

  // Handle review notes updates
  const handleUpdateClarification = (notes: string) => {
    if (bookingId) {
      updateReviewData({ bookingId, clarificationNotes: notes });
    }
  };

  const handleUpdateNotes = (notes: string) => {
    if (bookingId) {
      updateReviewData({ bookingId, reviewerNotes: notes });
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading interview questions...</p>
        </div>
      </div>
    );
  }

  // No booking state
  if (!bookingId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Interview Not Scheduled</AlertTitle>
        <AlertDescription>
          This candidate does not have an interview booking yet. The Interview Kit will be available once an interview is scheduled.
        </AlertDescription>
      </Alert>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Interview Kit</AlertTitle>
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load interview questions"}
        </AlertDescription>
      </Alert>
    );
  }

  // No data state
  if (!sessionData || sessionData.questions.length === 0) {
    return (
      <Alert>
        <ClipboardList className="h-4 w-4" />
        <AlertTitle>No Questions Available</AlertTitle>
        <AlertDescription>
          No interview questions could be generated for this candidate. Please ensure the candidate has selected specialities and the question bank has been populated.
        </AlertDescription>
      </Alert>
    );
  }

  // Calculate rating distribution
  const ratingDistribution = {
    right: sessionData.questions.filter(q => q.rating === 'right').length,
    wrong: sessionData.questions.filter(q => q.rating === 'wrong').length,
    not_answered: sessionData.questions.filter(q => q.rating === 'not_answered').length,
  };

  const isSubmitted = !!sessionData.evaluation?.evaluatedAt;

  return (
    <div className="space-y-4" id="interview-kit-content">
      {/* Header with Score Summary */}
      <InterviewKitHeader
        totalQuestions={sessionData.stats.totalQuestions}
        ratedQuestions={sessionData.stats.ratedQuestions}
        earnedPoints={sessionData.stats.earnedPoints}
        maxPoints={sessionData.stats.maxPoints}
        percentage={sessionData.stats.percentage}
        recommendation={sessionData.stats.recommendation as RecommendationLevel}
        ratingDistribution={ratingDistribution}
      />

      {/* Scoring Logic Reference */}
      <InterviewKitScoringLogic />

      {/* Review Notes Section */}
      <InterviewKitReviewNotes
        flagForClarification={!!flagForClarification}
        clarificationNotes={clarificationNotes || null}
        reviewerNotes={reviewerNotes || null}
        onUpdateClarification={handleUpdateClarification}
        onUpdateNotes={handleUpdateNotes}
        isUpdating={isUpdatingReview}
      />

      {/* Interview Questions by Section */}
      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Interview Questions
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Auto-generated from: Industry → Level → Areas → Specialities
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from(sessionData.sectionedQuestions.entries()).map(([sectionName, questions], index) => (
            <InterviewQuestionSection
              key={sectionName}
              sectionName={sectionName}
              questions={questions}
              onRatingChange={handleRatingChange}
              savingQuestionId={savingQuestionId}
              defaultOpen={index === 0}
            />
          ))}
        </CardContent>
      </Card>

      {/* Footer with Actions */}
      <InterviewKitFooter
        totalQuestions={sessionData.stats.totalQuestions}
        ratedQuestions={sessionData.stats.ratedQuestions}
        earnedPoints={sessionData.stats.earnedPoints}
        maxPoints={sessionData.stats.maxPoints}
        percentage={sessionData.stats.percentage}
        recommendation={sessionData.stats.recommendation as RecommendationLevel}
        isSubmitted={isSubmitted}
        onSubmit={handleSubmit}
        onExportPdf={handleExportPdf}
        isSubmitting={submitInterview.isPending}
      />
    </div>
  );
}
