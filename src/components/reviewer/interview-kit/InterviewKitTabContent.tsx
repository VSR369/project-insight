/**
 * Interview Kit Tab Content - Complete Implementation
 * 
 * Displays the full Interview Kit with:
 * - Domain & Delivery Depth questions (from question_bank)
 * - Proof Points Deep-Dive (generated from proof point descriptions)
 * - Competency questions (from interview_kit_questions)
 * 
 * Features:
 * - Auto-generate questions on first visit
 * - CRUD operations for questions
 * - Rating system with optional comments
 */

import { useState, useEffect, useMemo } from "react";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { InterviewKitHeader } from "./InterviewKitHeader";
import { InterviewKitFooter } from "./InterviewKitFooter";
import { InterviewKitSummaryDashboard } from "./InterviewKitSummaryDashboard";
import { InterviewKitSection } from "./InterviewKitSection";
import { InterviewQuestionCard } from "./InterviewQuestionCard";
import { ProofPointQuestionGroup } from "./ProofPointQuestionGroup";
import { AddQuestionDialog } from "./AddQuestionDialog";
import { EditQuestionDialog } from "./EditQuestionDialog";
import { DeleteQuestionConfirm } from "./DeleteQuestionConfirm";
import { useCandidateProofPoints } from "@/hooks/queries/useCandidateProofPoints";
import { useCandidateExpertise } from "@/hooks/queries/useCandidateExpertise";
import { useCandidateDetail } from "@/hooks/queries/useCandidateDetail";
import { useInterviewKitCompetencies } from "@/hooks/queries/useInterviewKitCompetencies";
import {
  useInterviewKitEvaluation,
  useGenerateInterviewQuestions,
  useUpdateQuestionRating,
  useUpdateQuestionText,
  useDeleteQuestion,
  useAddCustomQuestion,
  type InterviewQuestionResponse,
  type QuestionRating,
} from "@/hooks/queries/useInterviewKitEvaluation";
import { toast } from "sonner";

interface InterviewKitTabContentProps {
  enrollmentId: string;
}

export function InterviewKitTabContent({ enrollmentId }: InterviewKitTabContentProps) {
  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['domain']));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<InterviewQuestionResponse | null>(null);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [addDialogContext, setAddDialogContext] = useState<{
    sectionName: string;
    sectionType: 'domain' | 'proof_point' | 'competency';
    sectionLabel?: string;
    proofPointId?: string;
  } | null>(null);

  // ─────────────────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────────────────
  const { data: candidate, isLoading: candidateLoading } = useCandidateDetail(enrollmentId);
  const { data: expertise, isLoading: expertiseLoading } = useCandidateExpertise(enrollmentId);
  const { data: proofPointsData, isLoading: proofPointsLoading } = useCandidateProofPoints(enrollmentId);
  const { data: competencies, isLoading: competenciesLoading } = useInterviewKitCompetencies();
  
  const bookingId = candidate?.interviewBookingId;
  
  const { 
    data: evaluationData, 
    isLoading: evaluationLoading,
    refetch: refetchEvaluation 
  } = useInterviewKitEvaluation(bookingId);

  // ─────────────────────────────────────────────────────────────────────────
  // Mutations
  // ─────────────────────────────────────────────────────────────────────────
  const generateQuestions = useGenerateInterviewQuestions();
  const updateRating = useUpdateQuestionRating();
  const updateText = useUpdateQuestionText();
  const deleteQuestion = useDeleteQuestion();
  const addQuestion = useAddCustomQuestion();

  const isLoading = candidateLoading || expertiseLoading || proofPointsLoading || 
                    competenciesLoading || evaluationLoading;
  const isUpdating = updateRating.isPending || updateText.isPending || 
                     deleteQuestion.isPending || addQuestion.isPending;

  // ─────────────────────────────────────────────────────────────────────────
  // Auto-generate questions on first load
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      evaluationData &&
      evaluationData.questions.length === 0 &&
      !generateQuestions.isPending &&
      expertise?.proficiencyTree &&
      proofPointsData?.proofPoints &&
      competencies &&
      candidate?.industrySegmentId &&
      candidate?.expertiseLevelId
    ) {
      generateQuestions.mutate({
        evaluationId: evaluationData.evaluation.id,
        proficiencyTree: expertise.proficiencyTree,
        competencies,
        proofPoints: proofPointsData.proofPoints,
        industrySegmentId: candidate.industrySegmentId,
        expertiseLevelId: candidate.expertiseLevelId,
      });
    }
  }, [
    evaluationData?.evaluation?.id,
    evaluationData?.questions?.length,
    expertise?.proficiencyTree,
    proofPointsData?.proofPoints,
    competencies,
    candidate?.industrySegmentId,
    candidate?.expertiseLevelId,
  ]);

  // ─────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────
  const toggleSection = (sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const handleRatingChange = (questionId: string, rating: QuestionRating, comments?: string) => {
    updateRating.mutate({ questionId, rating, comments });
  };

  const handleEditQuestion = (question: InterviewQuestionResponse) => {
    setSelectedQuestion(question);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = (questionId: string, data: { questionText: string; expectedAnswer?: string }) => {
    updateText.mutate({
      questionId,
      questionText: data.questionText,
      expectedAnswer: data.expectedAnswer,
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestionToDelete(questionId);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (questionToDelete) {
      deleteQuestion.mutate(questionToDelete, {
        onSuccess: () => {
          setDeleteConfirmOpen(false);
          setQuestionToDelete(null);
        },
      });
    }
  };

  const handleAddQuestion = (context: {
    sectionName: string;
    sectionType: 'domain' | 'proof_point' | 'competency';
    sectionLabel?: string;
    proofPointId?: string;
  }) => {
    setAddDialogContext(context);
    setAddDialogOpen(true);
  };

  const handleAddSubmit = (data: {
    questionText: string;
    expectedAnswer?: string;
    sectionName: string;
    sectionType: 'domain' | 'proof_point' | 'competency';
    sectionLabel?: string;
    proofPointId?: string;
  }) => {
    if (!evaluationData) return;
    
    addQuestion.mutate({
      evaluationId: evaluationData.evaluation.id,
      ...data,
    });
  };

  const handleExport = () => {
    toast.info("Export functionality coming soon");
  };

  const handleRegenerate = () => {
    if (
      evaluationData &&
      expertise?.proficiencyTree &&
      proofPointsData?.proofPoints &&
      competencies &&
      candidate?.industrySegmentId &&
      candidate?.expertiseLevelId
    ) {
      generateQuestions.mutate({
        evaluationId: evaluationData.evaluation.id,
        proficiencyTree: expertise.proficiencyTree,
        competencies,
        proofPoints: proofPointsData.proofPoints,
        industrySegmentId: candidate.industrySegmentId,
        expertiseLevelId: candidate.expertiseLevelId,
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Computed Data
  // ─────────────────────────────────────────────────────────────────────────
  const domainQuestions = evaluationData?.domainQuestions || [];
  const allProofPointQuestions = evaluationData?.proofPointQuestions || [];
  const competencyQuestionsMap = evaluationData?.competencyQuestions || new Map();

  // Group proof point questions by proof point ID
  const proofPointQuestionGroups = useMemo(() => {
    const groups = new Map<string, InterviewQuestionResponse[]>();
    for (const q of allProofPointQuestions) {
      if (q.proofPointId) {
        const existing = groups.get(q.proofPointId) || [];
        existing.push(q);
        groups.set(q.proofPointId, existing);
      }
    }
    return groups;
  }, [allProofPointQuestions]);

  // Calculate section stats
  const domainStats = useMemo(() => {
    const rated = domainQuestions.filter(q => q.rating !== null).length;
    const score = domainQuestions.reduce((s, q) => s + q.score, 0);
    const maxScore = domainQuestions.length * 5;
    return { rated, total: domainQuestions.length, score, maxScore };
  }, [domainQuestions]);

  const proofPointStats = useMemo(() => {
    const rated = allProofPointQuestions.filter(q => q.rating !== null).length;
    const score = allProofPointQuestions.reduce((s, q) => s + q.score, 0);
    const maxScore = allProofPointQuestions.length * 5;
    return { rated, total: allProofPointQuestions.length, score, maxScore };
  }, [allProofPointQuestions]);

  // Rating distribution for dashboard
  const ratingDistribution = useMemo(() => {
    const activeQuestions = evaluationData?.questions.filter(q => !q.isDeleted) || [];
    const rightCount = activeQuestions.filter(q => q.rating === 'right').length;
    const wrongCount = activeQuestions.filter(q => q.rating === 'wrong').length;
    const notAnsweredCount = activeQuestions.filter(q => q.rating === 'not_answered').length;
    const ratedCount = activeQuestions.filter(q => q.rating !== null).length;
    
    return { rightCount, wrongCount, notAnsweredCount, ratedCount };
  }, [evaluationData?.questions]);

  // Sections count (domain + proof points + each competency)
  const sectionsCount = useMemo(() => {
    let count = 0;
    if (domainQuestions.length > 0) count += 1;
    if (allProofPointQuestions.length > 0) count += 1;
    count += (competencies?.length || 0);
    return count;
  }, [domainQuestions.length, allProofPointQuestions.length, competencies?.length]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!candidate?.interviewBookingId) {
    return (
      <Alert>
        <AlertDescription>
          No interview booking found for this enrollment. The Interview Kit will be available once an interview is scheduled.
        </AlertDescription>
      </Alert>
    );
  }

  if (!evaluationData) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Failed to load interview evaluation data.
        </AlertDescription>
      </Alert>
    );
  }

  const hasNoQuestions = evaluationData.questions.length === 0;

  return (
    <div className="space-y-6">
      {/* Summary Dashboard */}
      <InterviewKitSummaryDashboard
        totalQuestions={evaluationData.totalQuestions}
        ratedQuestions={ratingDistribution.ratedCount}
        totalScore={evaluationData.totalScore}
        maxScore={evaluationData.maxScore}
        sectionsCount={sectionsCount}
        rightCount={ratingDistribution.rightCount}
        wrongCount={ratingDistribution.wrongCount}
        notAnsweredCount={ratingDistribution.notAnsweredCount}
      />

      <InterviewKitHeader />

      {/* Generate/Regenerate Button */}
      {hasNoQuestions && !generateQuestions.isPending && (
        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              No questions generated yet. Click below to generate interview questions based on the candidate's profile.
            </p>
            <Button onClick={handleRegenerate} disabled={generateQuestions.isPending}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Interview Questions
            </Button>
          </div>
        </div>
      )}

      {generateQuestions.isPending && (
        <div className="flex items-center justify-center p-8 border-2 border-dashed rounded-lg">
          <div className="text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Generating interview questions...</p>
          </div>
        </div>
      )}

      {!hasNoQuestions && !generateQuestions.isPending && (
        <div className="space-y-3">
          {/* Domain & Delivery Depth Section */}
          <InterviewKitSection
            name="Domain & Delivery Depth"
            questionCount={domainQuestions.length}
            score={domainStats.score}
            maxScore={domainStats.maxScore}
            ratedCount={domainStats.rated}
            totalCount={domainStats.total}
            isExpanded={expandedSections.has('domain')}
            onToggle={() => toggleSection('domain')}
          >
            <div className="space-y-4">
              {domainQuestions.map((question, idx) => (
                <InterviewQuestionCard
                  key={question.id}
                  question={question}
                  questionNumber={idx + 1}
                  onRatingChange={handleRatingChange}
                  onEdit={handleEditQuestion}
                  onDelete={handleDeleteQuestion}
                  isUpdating={isUpdating}
                />
              ))}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleAddQuestion({
                  sectionName: 'Domain & Delivery Depth',
                  sectionType: 'domain',
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Question
              </Button>
            </div>
          </InterviewKitSection>

          {/* Proof Points Deep-Dive Section */}
          <InterviewKitSection
            name="Proof Points Deep-Dive"
            questionCount={allProofPointQuestions.length}
            score={proofPointStats.score}
            maxScore={proofPointStats.maxScore}
            ratedCount={proofPointStats.rated}
            totalCount={proofPointStats.total}
            isExpanded={expandedSections.has('proof_points')}
            onToggle={() => toggleSection('proof_points')}
          >
            <div className="space-y-4">
              {proofPointsData?.proofPoints.map((pp, ppIdx) => {
                const questions = proofPointQuestionGroups.get(pp.id) || [];
                if (questions.length === 0) return null;
                
                return (
                  <ProofPointQuestionGroup
                    key={pp.id}
                    proofPoint={pp}
                    questions={questions}
                    startIndex={domainQuestions.length + ppIdx + 1}
                    onRatingChange={handleRatingChange}
                    onEditQuestion={handleEditQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onAddQuestion={(proofPointId, title) => handleAddQuestion({
                      sectionName: 'Proof Points Deep-Dive',
                      sectionType: 'proof_point',
                      sectionLabel: title,
                      proofPointId,
                    })}
                    isUpdating={isUpdating}
                  />
                );
              })}
            </div>
          </InterviewKitSection>

          {/* Competency Sections */}
          {competencies?.map((competency) => {
            const questions = competencyQuestionsMap.get(competency.name) || [];
            const rated = questions.filter(q => q.rating !== null).length;
            const score = questions.reduce((s, q) => s + q.score, 0);
            const maxScore = questions.length * 5;

            return (
              <InterviewKitSection
                key={competency.id}
                name={competency.name}
                questionCount={questions.length}
                score={score}
                maxScore={maxScore}
                ratedCount={rated}
                totalCount={questions.length}
                isExpanded={expandedSections.has(competency.id)}
                onToggle={() => toggleSection(competency.id)}
              >
                <div className="space-y-4">
                  {questions.map((question, idx) => (
                    <InterviewQuestionCard
                      key={question.id}
                      question={question}
                      questionNumber={idx + 1}
                      onRatingChange={handleRatingChange}
                      onEdit={handleEditQuestion}
                      onDelete={handleDeleteQuestion}
                      isUpdating={isUpdating}
                    />
                  ))}
                  {questions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No questions available for this competency
                    </p>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAddQuestion({
                      sectionName: competency.name,
                      sectionType: 'competency',
                      sectionLabel: competency.name,
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Question
                  </Button>
                </div>
              </InterviewKitSection>
            );
          })}
        </div>
      )}

      <InterviewKitFooter
        allRated={evaluationData.allRated}
        totalScore={evaluationData.totalScore}
        maxScore={evaluationData.maxScore}
        totalQuestions={evaluationData.totalQuestions}
        correctCount={evaluationData.questions.filter(q => q.rating === 'right' && !q.isDeleted).length}
        bookingId={bookingId!}
        evaluationId={evaluationData.evaluation.id}
        onExport={handleExport}
      />

      {/* Dialogs */}
      {addDialogContext && (
        <AddQuestionDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          sectionName={addDialogContext.sectionName}
          sectionType={addDialogContext.sectionType}
          sectionLabel={addDialogContext.sectionLabel}
          proofPointId={addDialogContext.proofPointId}
          onSubmit={handleAddSubmit}
          isSubmitting={addQuestion.isPending}
        />
      )}

      <EditQuestionDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        question={selectedQuestion}
        onSubmit={handleEditSubmit}
        isSubmitting={updateText.isPending}
      />

      <DeleteQuestionConfirm
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        onConfirm={handleConfirmDelete}
        isDeleting={deleteQuestion.isPending}
      />
    </div>
  );
}
