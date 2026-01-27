/**
 * Interview Kit Tab Content
 * Main container for the Interview Kit tab in Candidate Detail page
 */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Loader2, AlertCircle, FileQuestion, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { InterviewKitScoreHeader } from "./InterviewKitScoreHeader";
import { InterviewKitScoringLogic } from "./InterviewKitScoringLogic";
import { InterviewKitSection } from "./InterviewKitSection";
import { AddQuestionDialog } from "./AddQuestionDialog";
import { EditQuestionDialog } from "./EditQuestionDialog";
import { DeleteQuestionConfirm } from "./DeleteQuestionConfirm";
import { InterviewKitSubmitFooter } from "./InterviewKitSubmitFooter";

import {
  useInterviewKitData,
  useGenerateInterviewKit,
  useUpdateInterviewResponse,
  useAddCustomQuestion,
  useEditInterviewQuestion,
  useDeleteInterviewQuestion,
  useSubmitInterviewEvaluation,
  useRegenerateInterviewKit,
  type InterviewQuestionResponse,
} from "@/hooks/queries/useInterviewKit";
import { useCandidateProofPoints } from "@/hooks/queries/useCandidateProofPoints";
import { useCandidateDetail } from "@/hooks/queries/useCandidateDetail";
import type { InterviewRating } from "@/constants/interview-kit-reviewer.constants";
import { SECTION_TYPE } from "@/constants/interview-kit-reviewer.constants";

interface InterviewKitTabContentProps {
  enrollmentId: string;
  bookingId: string | undefined;
}

export function InterviewKitTabContent({ enrollmentId, bookingId }: InterviewKitTabContentProps) {
  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState<{ name: string; type: string } | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<InterviewQuestionResponse | null>(null);

  // Fetch candidate details for context
  const { data: candidate } = useCandidateDetail(enrollmentId);

  // Fetch proof points for generation
  const { data: proofPointsData } = useCandidateProofPoints(enrollmentId);

  // Fetch existing interview kit data
  const { 
    data: kitData, 
    isLoading: isLoadingKit, 
    error: kitError,
    refetch: refetchKit,
  } = useInterviewKitData(bookingId);

  // Mutations
  const generateKit = useGenerateInterviewKit();
  const regenerateKit = useRegenerateInterviewKit();
  const updateResponse = useUpdateInterviewResponse();
  const addQuestion = useAddCustomQuestion();
  const editQuestion = useEditInterviewQuestion();
  const deleteQuestion = useDeleteInterviewQuestion();
  const submitEvaluation = useSubmitInterviewEvaluation();

  // Ref to track if we've already triggered auto-generation (prevent double-trigger)
  const hasTriggeredAutoGenRef = useRef(false);

  // Auto-generate interview kit when tab opens (if not already generated)
  useEffect(() => {
    // Skip if already generated or no data available
    if (!kitData || kitData.isGenerated) {
      return;
    }

    // Skip if required data not available
    if (!bookingId || !candidate || !proofPointsData) {
      return;
    }

    // Skip if generation in progress or already triggered
    if (generateKit.isPending || hasTriggeredAutoGenRef.current) {
      return;
    }

    // Mark as triggered to prevent double-calls
    hasTriggeredAutoGenRef.current = true;

    console.log('[InterviewKit] Auto-generating on tab open...');
    generateKit.mutate({
      bookingId,
      context: {
        enrollmentId,
        industrySegmentId: candidate.industrySegmentId,
        expertiseLevelId: candidate.expertiseLevelId,
        providerId: candidate.providerId,
      },
      proofPoints: proofPointsData.proofPoints || [],
    });
  }, [
    kitData?.isGenerated, 
    bookingId, 
    candidate, 
    proofPointsData, 
    generateKit.isPending, 
    enrollmentId,
  ]);

  // Reset the trigger ref when booking changes
  useEffect(() => {
    hasTriggeredAutoGenRef.current = false;
  }, [bookingId]);

  // Group questions by section and sort sections by display order
  const sortedSections = useMemo(() => {
    if (!kitData?.responses) return [];

    const grouped = new Map<string, InterviewQuestionResponse[]>();
    
    for (const q of kitData.responses) {
      const key = `${q.section_type}::${q.section_name}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(q);
    }

    // Sort questions within each section by display_order
    grouped.forEach((questions) => {
      questions.sort((a, b) => a.display_order - b.display_order);
    });

    // Sort sections by first question's display_order (ensures Domain→Proof Points→Competencies)
    return Array.from(grouped.entries()).sort(([, questionsA], [, questionsB]) => {
      const orderA = questionsA[0]?.display_order ?? 0;
      const orderB = questionsB[0]?.display_order ?? 0;
      return orderA - orderB;
    });
  }, [kitData?.responses]);

  // Get unique sections count from sorted sections
  const uniqueSectionsCount = sortedSections.length;

  // Handler for generating interview kit (manual button click)
  const handleGenerateKit = useCallback(async () => {
    if (!bookingId || !candidate) {
      toast.error("Missing booking or candidate information");
      return;
    }

    // Mark as triggered to prevent double-calls
    hasTriggeredAutoGenRef.current = true;

    generateKit.mutate({
      bookingId,
      context: {
        enrollmentId,
        industrySegmentId: candidate.industrySegmentId,
        expertiseLevelId: candidate.expertiseLevelId,
        providerId: candidate.providerId,
      },
      proofPoints: proofPointsData?.proofPoints || [],
    });
  }, [bookingId, candidate, enrollmentId, proofPointsData, generateKit]);

  // Handler for regenerating interview kit (clears and recreates)
  const handleRegenerateKit = useCallback(async () => {
    if (!bookingId || !candidate) {
      toast.error("Missing booking or candidate information");
      return;
    }

    // First delete existing, then regenerate
    regenerateKit.mutate(bookingId, {
      onSuccess: () => {
        // Reset the trigger ref to allow fresh generation
        hasTriggeredAutoGenRef.current = false;
        // The useEffect will auto-trigger generation when query refreshes
      },
    });
  }, [bookingId, candidate, regenerateKit]);

  // Handler for rating change
  const handleRatingChange = useCallback((responseId: string, rating: InterviewRating) => {
    updateResponse.mutate({ responseId, rating });
  }, [updateResponse]);

  // Handler for comments change
  const handleCommentsChange = useCallback((responseId: string, comments: string) => {
    updateResponse.mutate({ responseId, comments });
  }, [updateResponse]);

  // Handler for opening add dialog
  const handleOpenAddDialog = useCallback((sectionName: string, sectionType: string) => {
    setSelectedSection({ name: sectionName, type: sectionType });
    setAddDialogOpen(true);
  }, []);

  // Handler for adding custom question
  const handleAddQuestion = useCallback((data: { questionText: string; expectedAnswer: string | null }) => {
    if (!kitData?.evaluation?.id || !selectedSection) return;

    addQuestion.mutate({
      evaluationId: kitData.evaluation.id,
      questionText: data.questionText,
      expectedAnswer: data.expectedAnswer,
      sectionName: selectedSection.name,
      sectionType: selectedSection.type,
    }, {
      onSuccess: () => setAddDialogOpen(false),
    });
  }, [kitData?.evaluation?.id, selectedSection, addQuestion]);

  // Handler for opening edit dialog
  const handleOpenEditDialog = useCallback((question: InterviewQuestionResponse) => {
    setSelectedQuestion(question);
    setEditDialogOpen(true);
  }, []);

  // Handler for editing question
  const handleEditQuestion = useCallback((data: { responseId: string; questionText: string; expectedAnswer: string | null }) => {
    editQuestion.mutate(data, {
      onSuccess: () => setEditDialogOpen(false),
    });
  }, [editQuestion]);

  // Handler for opening delete dialog
  const handleOpenDeleteDialog = useCallback((question: InterviewQuestionResponse) => {
    setSelectedQuestion(question);
    setDeleteDialogOpen(true);
  }, []);

  // Handler for deleting question
  const handleDeleteQuestion = useCallback((responseId: string) => {
    deleteQuestion.mutate(responseId, {
      onSuccess: () => setDeleteDialogOpen(false),
    });
  }, [deleteQuestion]);

  // Handler for submitting evaluation
  const handleSubmitEvaluation = useCallback(() => {
    if (!kitData?.evaluation?.id || !bookingId || !kitData.score) return;

    submitEvaluation.mutate({
      evaluationId: kitData.evaluation.id,
      bookingId,
      overallScore: kitData.score.totalScore,
      scorePercentage: kitData.score.scorePercentage,
      outcome: kitData.score.recommendation,
    });
  }, [kitData, bookingId, submitEvaluation]);

  // Handler for PDF export (placeholder)
  const handleExportPdf = useCallback(() => {
    toast.info("PDF export coming soon");
  }, []);

  // Check if evaluation is submitted
  const isSubmitted = !!kitData?.evaluation?.evaluated_at;

  // Loading state
  if (isLoadingKit) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Error state
  if (kitError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading interview kit</AlertTitle>
        <AlertDescription>
          {kitError instanceof Error ? kitError.message : "Please try again later."}
        </AlertDescription>
      </Alert>
    );
  }

  // No booking state
  if (!bookingId) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Interview Scheduled</AlertTitle>
        <AlertDescription>
          The interview kit will be available once an interview is scheduled for this candidate.
        </AlertDescription>
      </Alert>
    );
  }

  // Not generated state - show auto-generating spinner or manual button
  if (!kitData?.isGenerated) {
    // If generation is in progress (either auto or manual)
    if (generateKit.isPending) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[300px] gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Generating interview kit...</p>
        </div>
      );
    }

    // If data is still loading but generation hasn't started
    return (
      <Card className="border-dashed">
        <CardHeader className="text-center">
          <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
          <CardTitle>Interview Kit Not Generated</CardTitle>
          <CardDescription>
            Generate the interview kit to start the evaluation. Questions will be automatically 
            selected based on the candidate's expertise, specialities, and proof points.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Button 
            onClick={handleGenerateKit}
            disabled={generateKit.isPending}
            size="lg"
          >
            Generate Interview Kit
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Main interview kit view
  return (
    <div className="space-y-6">
      {/* Score Header */}
      <InterviewKitScoreHeader 
        score={kitData.score} 
        sectionsCount={uniqueSectionsCount} 
      />

      {/* Scoring Logic Info */}
      <InterviewKitScoringLogic />

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Interview Questions</h3>
          <p className="text-sm text-muted-foreground">
            Auto-generated from Industry Segment → Expertise Level → Proficiency Areas → Sub-domains → Specialities
          </p>
        </div>
        {!isSubmitted && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateKit}
            disabled={regenerateKit.isPending || generateKit.isPending}
          >
            {(regenerateKit.isPending || generateKit.isPending) ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Regenerate
          </Button>
        )}
      </div>

      {/* Question Sections */}
      <div className="space-y-4">
        {sortedSections.map(([key, questions]) => {
          const [sectionType, sectionName] = key.split('::');
          return (
            <InterviewKitSection
              key={key}
              sectionName={sectionName}
              sectionType={sectionType}
              questions={questions}
              onRatingChange={handleRatingChange}
              onCommentsChange={handleCommentsChange}
              onEditQuestion={handleOpenEditDialog}
              onDeleteQuestion={handleOpenDeleteDialog}
              onAddQuestion={handleOpenAddDialog}
              isUpdating={updateResponse.isPending}
              defaultExpanded={sectionType === SECTION_TYPE.domain}
            />
          );
        })}
      </div>

      {/* Submit Footer */}
      <InterviewKitSubmitFooter
        score={kitData.score}
        onSubmit={handleSubmitEvaluation}
        onExportPdf={handleExportPdf}
        isSubmitting={submitEvaluation.isPending}
        isSubmitted={isSubmitted}
      />

      {/* Dialogs */}
      <AddQuestionDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        sectionName={selectedSection?.name || ""}
        sectionType={selectedSection?.type || ""}
        onSubmit={handleAddQuestion}
        isSubmitting={addQuestion.isPending}
      />

      <EditQuestionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        question={selectedQuestion}
        onSubmit={handleEditQuestion}
        isSubmitting={editQuestion.isPending}
      />

      <DeleteQuestionConfirm
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        question={selectedQuestion}
        onConfirm={handleDeleteQuestion}
        isDeleting={deleteQuestion.isPending}
      />
    </div>
  );
}
