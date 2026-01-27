/**
 * Interview Kit Session Hooks
 * Manages interview evaluation and question responses
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from "@/lib/auditFields";
import { toast } from "sonner";
import { 
  generateAllInterviewQuestions, 
  GeneratedQuestion,
} from "@/services/interviewKitQuestionService";
import { 
  InterviewRating, 
  calculateInterviewScore 
} from "@/constants/interview-kit-scoring.constants";

// =====================================================
// Types
// =====================================================

export type QuestionSource = 'interview_kit' | 'question_bank' | 'proof_point' | 'reviewer_custom';

export interface InterviewQuestionResponse {
  id: string;
  evaluationId: string;
  questionSource: QuestionSource;
  questionId: string | null;
  proofPointId: string | null;
  questionText: string;
  expectedAnswer: string | null;
  rating: InterviewRating | null;
  comments: string | null;
  sectionName: string;
  displayOrder: number;
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
  evaluation: InterviewEvaluation | null;
  questions: InterviewQuestionResponse[];
  generatedQuestions: GeneratedQuestion[];
  sectionedQuestions: Map<string, InterviewQuestionResponse[]>;
  sectionNames: string[];
  stats: {
    totalQuestions: number;
    ratedQuestions: number;
    earnedPoints: number;
    maxPoints: number;
    percentage: number;
    recommendation: string;
  };
}

// =====================================================
// Query Hooks
// =====================================================

/**
 * Fetch or initialize interview kit session
 */
export function useInterviewKitSession(
  bookingId: string | undefined,
  enrollmentId: string | undefined,
  industrySegmentId: string | undefined,
  expertiseLevelId: string | undefined
) {
  return useQuery({
    queryKey: ["interview_kit_session", bookingId],
    queryFn: async (): Promise<InterviewKitData> => {
      if (!bookingId || !enrollmentId || !industrySegmentId || !expertiseLevelId) {
        throw new Error("Missing required parameters for interview kit");
      }

      // Get current reviewer
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!reviewer) throw new Error("Reviewer not found");

      // Check for existing evaluation
      let evaluation: InterviewEvaluation | null = null;
      const { data: existingEval } = await supabase
        .from("interview_evaluations")
        .select("*")
        .eq("booking_id", bookingId)
        .eq("reviewer_id", reviewer.id)
        .maybeSingle();

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
      }

      // Generate questions (deterministic based on bookingId)
      const generatedQuestions = await generateAllInterviewQuestions(
        enrollmentId,
        industrySegmentId,
        expertiseLevelId,
        bookingId
      );

      // If evaluation exists, fetch existing responses
      let questions: InterviewQuestionResponse[] = [];
      
      if (evaluation) {
        const { data: responses } = await supabase
          .from("interview_question_responses")
          .select("*")
          .eq("evaluation_id", evaluation.id)
          .order("display_order");

        if (responses && responses.length > 0) {
          questions = responses.map(r => ({
            id: r.id,
            evaluationId: r.evaluation_id,
            questionSource: r.question_source as QuestionSource,
            questionId: r.question_id,
            proofPointId: r.proof_point_id,
            questionText: r.question_text,
            expectedAnswer: r.expected_answer,
            rating: r.rating as InterviewRating | null,
            comments: r.comments,
            sectionName: r.section_name,
            displayOrder: r.display_order,
          }));
        }
      }

      // If no existing responses, map from generated questions
      if (questions.length === 0) {
        questions = generatedQuestions.map((gq, index) => ({
          id: gq.id, // Temporary ID until saved
          evaluationId: evaluation?.id || '',
          questionSource: gq.questionSource,
          questionId: gq.questionId,
          proofPointId: gq.proofPointId,
          questionText: gq.questionText,
          expectedAnswer: gq.expectedAnswer,
          rating: null,
          comments: null,
          sectionName: gq.sectionName,
          displayOrder: index,
        }));
      }

      // Collect section names in order
      const sectionNamesSet = new Set<string>();
      for (const q of questions) {
        sectionNamesSet.add(q.sectionName);
      }
      const sectionNames = Array.from(sectionNamesSet);

      // Group by section
      const sectionedQuestions = new Map<string, InterviewQuestionResponse[]>();
      for (const q of questions) {
        const existing = sectionedQuestions.get(q.sectionName) || [];
        existing.push(q);
        sectionedQuestions.set(q.sectionName, existing);
      }

      // Calculate stats
      const ratings = questions
        .filter(q => q.rating !== null)
        .map(q => q.rating as InterviewRating);
      const scoreData = calculateInterviewScore(ratings);

      return {
        evaluation,
        questions,
        generatedQuestions,
        sectionedQuestions,
        sectionNames,
        stats: {
          totalQuestions: questions.length,
          ratedQuestions: ratings.length,
          earnedPoints: scoreData.earned,
          maxPoints: questions.length * 5,
          percentage: questions.length > 0 ? scoreData.percentage : 0,
          recommendation: scoreData.recommendation,
        },
      };
    },
    enabled: !!bookingId && !!enrollmentId && !!industrySegmentId && !!expertiseLevelId,
    staleTime: 30 * 1000, // 30 seconds
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Create or get evaluation for current reviewer
 */
export function useCreateEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bookingId: string): Promise<string> => {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error("User not authenticated");

      // Get reviewer ID
      const { data: reviewer } = await supabase
        .from("panel_reviewers")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();

      if (!reviewer) throw new Error("Reviewer not found");

      // Check for existing evaluation
      const { data: existing } = await supabase
        .from("interview_evaluations")
        .select("id")
        .eq("booking_id", bookingId)
        .eq("reviewer_id", reviewer.id)
        .maybeSingle();

      if (existing) return existing.id;

      // Create new evaluation
      const evalData = await withCreatedBy({
        booking_id: bookingId,
        reviewer_id: reviewer.id,
      });

      const { data: newEval, error } = await supabase
        .from("interview_evaluations")
        .insert(evalData)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return newEval.id;
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'create_interview_evaluation' });
    },
  });
}

/**
 * Save a single question response
 */
export function useSaveQuestionResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evaluationId,
      question,
      rating,
      comments,
    }: {
      evaluationId: string;
      question: InterviewQuestionResponse | GeneratedQuestion;
      rating: InterviewRating;
      comments?: string;
    }) => {
      // Check if response already exists
      const { data: existing } = await supabase
        .from("interview_question_responses")
        .select("id")
        .eq("evaluation_id", evaluationId)
        .eq("question_text", question.questionText)
        .eq("display_order", question.displayOrder)
        .maybeSingle();

      if (existing) {
        // Update existing
        const updates = await withUpdatedBy({
          rating,
          comments: comments || null,
        });

        const { error } = await supabase
          .from("interview_question_responses")
          .update(updates)
          .eq("id", existing.id);

        if (error) throw new Error(error.message);
        return existing.id;
      } else {
        // Create new response
        const insertData = await withCreatedBy({
          evaluation_id: evaluationId,
          question_source: question.questionSource,
          question_id: question.questionId,
          proof_point_id: question.proofPointId,
          question_text: question.questionText,
          expected_answer: question.expectedAnswer,
          rating,
          comments: comments || null,
          section_name: question.sectionName,
          display_order: question.displayOrder,
        });

        const { data: newResponse, error } = await supabase
          .from("interview_question_responses")
          .insert(insertData)
          .select("id")
          .single();

        if (error) throw new Error(error.message);
        return newResponse.id;
      }
    },
    onSuccess: (_, variables) => {
      // Optimistically update cache
      queryClient.invalidateQueries({ 
        queryKey: ["interview_kit_session"] 
      });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_question_response' });
    },
  });
}

/**
 * Delete a question response
 */
export function useDeleteQuestionResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase
        .from("interview_question_responses")
        .delete()
        .eq("id", questionId);

      if (error) throw new Error(error.message);
      return questionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_session"] });
      toast.success("Question deleted");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_question_response' });
    },
  });
}

/**
 * Modify a question response (question text and expected answer)
 */
export function useModifyQuestionResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      questionId,
      questionText,
      expectedAnswer,
    }: {
      questionId: string;
      questionText: string;
      expectedAnswer: string | null;
    }) => {
      const updates = await withUpdatedBy({
        question_text: questionText,
        expected_answer: expectedAnswer,
      });

      const { error } = await supabase
        .from("interview_question_responses")
        .update(updates)
        .eq("id", questionId);

      if (error) throw new Error(error.message);
      return questionId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_session"] });
      toast.success("Question updated");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'modify_question_response' });
    },
  });
}

/**
 * Add a custom question to the interview
 */
export function useAddCustomQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evaluationId,
      questionText,
      expectedAnswer,
      sectionName,
      displayOrder,
    }: {
      evaluationId: string;
      questionText: string;
      expectedAnswer: string | null;
      sectionName: string;
      displayOrder: number;
    }) => {
      const insertData = await withCreatedBy({
        evaluation_id: evaluationId,
        question_source: 'reviewer_custom',
        question_id: null,
        proof_point_id: null,
        question_text: questionText,
        expected_answer: expectedAnswer,
        rating: null,
        comments: null,
        section_name: sectionName,
        display_order: displayOrder,
      });

      const { data: newQuestion, error } = await supabase
        .from("interview_question_responses")
        .insert(insertData)
        .select("id")
        .single();

      if (error) throw new Error(error.message);
      return newQuestion.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_session"] });
      toast.success("Custom question added");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'add_custom_question' });
    },
  });
}

/**
 * Submit completed interview
 */
export function useSubmitInterview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      evaluationId,
      bookingId,
      earnedPoints,
      maxPoints,
      recommendation,
    }: {
      evaluationId: string;
      bookingId: string;
      earnedPoints: number;
      maxPoints: number;
      recommendation: string;
    }) => {
      const score = maxPoints > 0 ? (earnedPoints / maxPoints) * 10 : 0;

      // Update evaluation with final score
      const evalUpdates = await withUpdatedBy({
        overall_score: Math.round(score * 10) / 10, // Round to 1 decimal
        outcome: recommendation,
        evaluated_at: new Date().toISOString(),
      });

      const { error: evalError } = await supabase
        .from("interview_evaluations")
        .update(evalUpdates)
        .eq("id", evaluationId);

      if (evalError) throw new Error(evalError.message);

      // Update booking status
      const bookingUpdates = await withUpdatedBy({
        interview_outcome: recommendation,
      });

      const { error: bookingError } = await supabase
        .from("interview_bookings")
        .update(bookingUpdates)
        .eq("id", bookingId);

      if (bookingError) throw new Error(bookingError.message);

      return { score, recommendation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["interview_kit_session"] });
      queryClient.invalidateQueries({ queryKey: ["candidate_detail"] });
      toast.success("Interview submitted successfully");
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_interview' });
    },
  });
}
