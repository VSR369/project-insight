/**
 * Interview Kit Evaluation Hook
 * 
 * Manages the interview evaluation and question responses for reviewers.
 * Supports fetching, generating, and CRUD operations on interview questions.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { toast } from "sonner";
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from "@/lib/auditFields";
import {
  generateAllInterviewQuestions,
  extractSpecialityIds,
  type GeneratedQuestion,
} from "@/services/interviewKitGenerationService";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";
import type { InterviewKitCompetency } from "@/hooks/queries/useInterviewKitCompetencies";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type QuestionRating = 'right' | 'wrong' | 'not_answered' | null;

export interface InterviewQuestionResponse {
  id: string;
  evaluationId: string;
  questionSource: 'question_bank' | 'interview_kit' | 'proof_point' | 'custom';
  questionBankId: string | null;
  interviewKitQuestionId: string | null;
  proofPointId: string | null;
  questionText: string;
  expectedAnswer: string | null;
  rating: QuestionRating;
  score: number;
  comments: string | null;
  sectionName: string;
  sectionType: 'domain' | 'proof_point' | 'competency';
  sectionLabel: string | null;
  displayOrder: number;
  isDeleted: boolean;
  // For domain questions
  hierarchyPath?: {
    proficiencyArea: string;
    subDomain: string;
    speciality: string;
  };
}

export interface InterviewEvaluation {
  id: string;
  bookingId: string;
  reviewerId: string;
  overallScore: number | null;
  outcome: string | null;
  notes: string | null;
  evaluatedAt: string | null;
}

export interface InterviewKitData {
  evaluation: InterviewEvaluation;
  questions: InterviewQuestionResponse[];
  // Grouped by section
  domainQuestions: InterviewQuestionResponse[];
  proofPointQuestions: InterviewQuestionResponse[];
  competencyQuestions: Map<string, InterviewQuestionResponse[]>;
  // Stats
  totalQuestions: number;
  ratedQuestions: number;
  allRated: boolean;
  totalScore: number;
  maxScore: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useInterviewKitEvaluation(bookingId: string | null) {
  return useQuery({
    queryKey: ["interview-kit-evaluation", bookingId],
    queryFn: async (): Promise<InterviewKitData | null> => {
      if (!bookingId) return null;

      // Get current user's reviewer ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data: reviewer, error: reviewerError } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (reviewerError) throw new Error(reviewerError.message);
      if (!reviewer) throw new Error("Not a reviewer");

      // Check if evaluation exists
      const { data: existingEval, error: evalError } = await supabase
        .from("interview_evaluations")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("reviewer_id", reviewer.id)
        .maybeSingle();

      if (evalError) throw new Error(evalError.message);

      let evaluation: InterviewEvaluation;

      if (existingEval) {
        evaluation = {
          id: existingEval.id,
          bookingId: existingEval.booking_id,
          reviewerId: existingEval.reviewer_id,
          overallScore: existingEval.overall_score,
          outcome: existingEval.outcome,
          notes: existingEval.notes,
          evaluatedAt: existingEval.evaluated_at,
        };
      } else {
        // Create new evaluation
        const evalData = await withCreatedBy({
          booking_id: bookingId,
          reviewer_id: reviewer.id,
        });

        const { data: newEval, error: createError } = await supabase
          .from("interview_evaluations")
          .insert(evalData)
          .select()
          .single();

        if (createError) throw new Error(createError.message);

        evaluation = {
          id: newEval.id,
          bookingId: newEval.booking_id,
          reviewerId: newEval.reviewer_id,
          overallScore: newEval.overall_score,
          outcome: newEval.outcome,
          notes: newEval.notes,
          evaluatedAt: newEval.evaluated_at,
        };
      }

      // Fetch question responses
      const { data: responses, error: responsesError } = await supabase
        .from("interview_question_responses")
        .select("*")
        .eq("evaluation_id", evaluation.id)
        .eq("is_deleted", false)
        .order("section_type")
        .order("display_order");

      if (responsesError) throw new Error(responsesError.message);

      const questions: InterviewQuestionResponse[] = (responses || []).map(r => ({
        id: r.id,
        evaluationId: r.evaluation_id,
        questionSource: r.question_source as any,
        questionBankId: r.question_bank_id,
        interviewKitQuestionId: r.interview_kit_question_id,
        proofPointId: r.proof_point_id,
        questionText: r.question_text,
        expectedAnswer: r.expected_answer,
        rating: r.rating as QuestionRating,
        score: r.score || 0,
        comments: r.comments,
        sectionName: r.section_name,
        sectionType: r.section_type as any,
        sectionLabel: r.section_label,
        displayOrder: r.display_order,
        isDeleted: r.is_deleted || false,
      }));

      // Group questions by section - handle both old (full name) and new (enum) formats
      const isDomainQuestion = (q: InterviewQuestionResponse) => 
        q.sectionType === 'domain' || q.sectionName === 'Domain & Delivery Depth';

      const isProofPointQuestion = (q: InterviewQuestionResponse) =>
        q.sectionType === 'proof_point' || q.sectionName === 'Proof Points Deep-Dive';

      const isCompetencyQuestion = (q: InterviewQuestionResponse) =>
        q.sectionType === 'competency' || 
        (!isDomainQuestion(q) && !isProofPointQuestion(q));

      const domainQuestions = questions.filter(isDomainQuestion);
      const proofPointQuestions = questions.filter(isProofPointQuestion);
      const competencyQuestions = new Map<string, InterviewQuestionResponse[]>();
      
      for (const q of questions.filter(isCompetencyQuestion)) {
        const key = q.sectionLabel || q.sectionName;
        const existing = competencyQuestions.get(key) || [];
        existing.push(q);
        competencyQuestions.set(key, existing);
      }

      // Calculate stats
      const activeQuestions = questions.filter(q => !q.isDeleted);
      const ratedQuestions = activeQuestions.filter(q => q.rating !== null);
      const totalScore = activeQuestions.reduce((sum, q) => sum + q.score, 0);
      const maxScore = activeQuestions.length * 5;

      return {
        evaluation,
        questions,
        domainQuestions,
        proofPointQuestions,
        competencyQuestions,
        totalQuestions: activeQuestions.length,
        ratedQuestions: ratedQuestions.length,
        allRated: ratedQuestions.length === activeQuestions.length && activeQuestions.length > 0,
        totalScore,
        maxScore,
      };
    },
    enabled: !!bookingId,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Generate Questions Mutation
// ─────────────────────────────────────────────────────────────────────────────

interface GenerateQuestionsParams {
  evaluationId: string;
  proficiencyTree: Array<{
    id: string;
    name: string;
    subDomains: Array<{
      id: string;
      name: string;
      specialities: Array<{ id: string; name: string }>;
    }>;
  }>;
  competencies: InterviewKitCompetency[];
  proofPoints: ProofPointForReview[];
  industrySegmentId: string;
  expertiseLevelId: string;
}

export function useGenerateInterviewQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: GenerateQuestionsParams) => {
      const {
        evaluationId,
        proficiencyTree,
        competencies,
        proofPoints,
        industrySegmentId,
        expertiseLevelId,
      } = params;

      // Extract speciality IDs from proficiency tree
      const specialityIds = extractSpecialityIds(proficiencyTree);

      // Generate all questions
      const generated = await generateAllInterviewQuestions({
        specialityIds,
        competencies,
        proofPoints,
        industrySegmentId,
        expertiseLevelId,
      });

      // Combine all questions
      const allQuestions: GeneratedQuestion[] = [
        ...generated.domainQuestions,
        ...generated.proofPointQuestions,
        ...generated.competencyQuestions,
      ];

      if (allQuestions.length === 0) {
        return { count: 0 };
      }

      // Get user ID for audit
      const userId = await getCurrentUserId();

      // Insert all questions into interview_question_responses
      const insertData = allQuestions.map((q, index) => ({
        evaluation_id: evaluationId,
        question_source: q.questionSource,
        question_bank_id: q.questionBankId || null,
        interview_kit_question_id: q.interviewKitQuestionId || null,
        proof_point_id: q.proofPointId || null,
        question_text: q.questionText,
        expected_answer: q.expectedAnswer,
        section_name: q.sectionName,
        section_type: q.sectionType,
        section_label: q.sectionLabel || null,
        display_order: index + 1,
        rating: null,
        score: 0,
        comments: null,
        is_deleted: false,
        created_by: userId,
      }));

      const { error } = await supabase
        .from("interview_question_responses")
        .insert(insertData);

      if (error) throw new Error(error.message);

      return { count: allQuestions.length };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
      if (result.count > 0) {
        toast.success(`Generated ${result.count} interview questions`);
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "generate_interview_questions" });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Question Rating
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateRatingParams {
  questionId: string;
  rating: QuestionRating;
  comments?: string;
}

export function useUpdateQuestionRating() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, rating, comments }: UpdateRatingParams) => {
      const score = rating === 'right' ? 5 : 0;

      const updates = await withUpdatedBy({
        rating,
        score,
        ...(comments !== undefined && { comments }),
      });

      const { error } = await supabase
        .from("interview_question_responses")
        .update(updates)
        .eq("id", questionId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_question_rating" });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Question Text (Edit)
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateQuestionTextParams {
  questionId: string;
  questionText: string;
  expectedAnswer?: string;
}

export function useUpdateQuestionText() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ questionId, questionText, expectedAnswer }: UpdateQuestionTextParams) => {
      const updates = await withUpdatedBy({
        question_text: questionText,
        ...(expectedAnswer !== undefined && { expected_answer: expectedAnswer }),
      });

      const { error } = await supabase
        .from("interview_question_responses")
        .update(updates)
        .eq("id", questionId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
      toast.success("Question updated");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_question_text" });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Question (Soft Delete)
// ─────────────────────────────────────────────────────────────────────────────

export function useDeleteQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: string) => {
      const updates = await withUpdatedBy({
        is_deleted: true,
      });

      const { error } = await supabase
        .from("interview_question_responses")
        .update(updates)
        .eq("id", questionId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
      toast.success("Question removed");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "delete_question" });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Add Custom Question
// ─────────────────────────────────────────────────────────────────────────────

interface AddCustomQuestionParams {
  evaluationId: string;
  questionText: string;
  expectedAnswer?: string;
  sectionName: string;
  sectionType: 'domain' | 'proof_point' | 'competency';
  sectionLabel?: string;
  proofPointId?: string;
}

export function useAddCustomQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddCustomQuestionParams) => {
      const {
        evaluationId,
        questionText,
        expectedAnswer,
        sectionName,
        sectionType,
        sectionLabel,
        proofPointId,
      } = params;

      // Get max display order for section
      const { data: existing } = await supabase
        .from("interview_question_responses")
        .select("display_order")
        .eq("evaluation_id", evaluationId)
        .eq("section_type", sectionType)
        .order("display_order", { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.display_order || 0;

      const insertData = await withCreatedBy({
        evaluation_id: evaluationId,
        question_source: 'custom' as const,
        question_text: questionText,
        expected_answer: expectedAnswer || null,
        section_name: sectionName,
        section_type: sectionType,
        section_label: sectionLabel || null,
        proof_point_id: proofPointId || null,
        display_order: maxOrder + 1,
        rating: null,
        score: 0,
        comments: null,
        is_deleted: false,
      });

      const { error } = await supabase
        .from("interview_question_responses")
        .insert(insertData);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
      toast.success("Question added");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "add_custom_question" });
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Update Evaluation (Final Score & Outcome)
// ─────────────────────────────────────────────────────────────────────────────

interface UpdateEvaluationParams {
  evaluationId: string;
  overallScore: number;
  outcome: 'pass' | 'fail';
  notes?: string;
}

export function useUpdateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ evaluationId, overallScore, outcome, notes }: UpdateEvaluationParams) => {
      const updates = await withUpdatedBy({
        overall_score: overallScore,
        outcome,
        notes: notes || null,
        evaluated_at: new Date().toISOString(),
      });

      const { error } = await supabase
        .from("interview_evaluations")
        .update(updates)
        .eq("id", evaluationId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview-kit-evaluation"] });
      toast.success("Evaluation submitted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: "update_evaluation" });
    },
  });
}
