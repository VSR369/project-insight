/**
 * Interview Kit Hooks
 * React Query hooks for managing interview evaluations and question responses
 * Per Project Knowledge Section 6 - Hook Organization Pattern
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError, logWarning } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from "@/lib/auditFields";
import { toast } from "sonner";
import { RATING_VALUES, type InterviewRating } from "@/constants/interview-kit-reviewer.constants";
import {
  buildInterviewKit,
  calculateInterviewScore,
  type GeneratedQuestion,
  type EnrollmentContext,
  type InterviewScoreResult,
} from "@/services/interviewKitGenerationService";
import type { ProofPointForReview } from "@/hooks/queries/useCandidateProofPoints";

// =====================================================
// Types
// =====================================================

export interface InterviewEvaluation {
  id: string;
  booking_id: string;
  reviewer_id: string;
  overall_score: number | null;
  outcome: string | null;
  notes: string | null;
  evaluated_at: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface InterviewQuestionResponse {
  id: string;
  evaluation_id: string;
  question_text: string;
  expected_answer: string | null;
  question_source: string;
  section_name: string;
  section_type: string | null;
  section_label: string | null;
  display_order: number;
  rating: string | null;
  score: number | null;
  comments: string | null;
  is_deleted: boolean | null;
  // FK references
  question_bank_id: string | null;
  interview_kit_question_id: string | null;
  proof_point_id: string | null;
  // Audit
  created_at: string;
  updated_at: string | null;
}

export interface InterviewKitData {
  evaluation: InterviewEvaluation | null;
  responses: InterviewQuestionResponse[];
  score: InterviewScoreResult;
  isGenerated: boolean;
}

export interface UpdateResponseParams {
  responseId: string;
  rating?: InterviewRating | null;
  comments?: string | null;
}

export interface AddCustomQuestionParams {
  evaluationId: string;
  questionText: string;
  expectedAnswer: string | null;
  sectionName: string;
  sectionType: string;
}

export interface UpdateQuestionParams {
  responseId: string;
  questionText: string;
  expectedAnswer: string | null;
}

// =====================================================
// Fetch Interview Kit Data
// =====================================================

/**
 * Fetch existing interview evaluation and responses for a booking
 */
export function useInterviewKitData(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['interview-kit', bookingId],
    queryFn: async (): Promise<InterviewKitData> => {
      if (!bookingId) {
        throw new Error('Booking ID is required');
      }

      // Get current reviewer's panel_reviewer record
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: reviewer, error: reviewerError } = await supabase
        .from('panel_reviewers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (reviewerError) throw new Error(reviewerError.message);
      if (!reviewer) throw new Error('Reviewer profile not found');

      // Fetch evaluation for this booking by this reviewer
      const { data: evaluation, error: evalError } = await supabase
        .from('interview_evaluations')
        .select('*')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewer.id)
        .maybeSingle();

      if (evalError) throw new Error(evalError.message);

      // If no evaluation exists, return empty state
      if (!evaluation) {
        return {
          evaluation: null,
          responses: [],
          score: calculateInterviewScore([]),
          isGenerated: false,
        };
      }

      // Fetch responses for this evaluation
      const { data: responses, error: respError } = await supabase
        .from('interview_question_responses')
        .select('*')
        .eq('evaluation_id', evaluation.id)
        .eq('is_deleted', false)
        .order('display_order', { ascending: true });

      if (respError) throw new Error(respError.message);

      const responseList = (responses || []) as InterviewQuestionResponse[];

      return {
        evaluation: evaluation as InterviewEvaluation,
        responses: responseList,
        score: calculateInterviewScore(responseList),
        isGenerated: true,
      };
    },
    enabled: !!bookingId,
  });
}

// =====================================================
// Generate Interview Kit
// =====================================================

/**
 * Generate and persist interview kit questions
 */
export function useGenerateInterviewKit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      bookingId: string;
      context: EnrollmentContext;
      proofPoints: ProofPointForReview[];
    }) => {
      const { bookingId, context, proofPoints } = params;

      // Get current reviewer
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: reviewer, error: reviewerError } = await supabase
        .from('panel_reviewers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();

      if (reviewerError) throw new Error(reviewerError.message);
      if (!reviewer) throw new Error('Reviewer profile not found');

      // Check if evaluation already exists
      const { data: existingEval } = await supabase
        .from('interview_evaluations')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewer.id)
        .maybeSingle();

      if (existingEval) {
        throw new Error('Interview kit already generated for this booking');
      }

      // Generate questions
      const generatedKit = await buildInterviewKit(context, proofPoints);

      if (generatedKit.totalCount === 0) {
        throw new Error('No questions could be generated. Please ensure question bank and competency questions are configured.');
      }

      // Create evaluation record
      const evalData = await withCreatedBy({
        booking_id: bookingId,
        reviewer_id: reviewer.id,
      });

      const { data: newEval, error: createEvalError } = await supabase
        .from('interview_evaluations')
        .insert(evalData)
        .select()
        .single();

      if (createEvalError) throw new Error(createEvalError.message);

      // Combine all questions
      const allQuestions: GeneratedQuestion[] = [
        ...generatedKit.domainQuestions,
        ...generatedKit.proofPointQuestions,
        ...generatedKit.competencyQuestions,
      ];

      // Insert all question responses
      const responsesToInsert = allQuestions.map(q => ({
        evaluation_id: newEval.id,
        question_text: q.question_text,
        expected_answer: q.expected_answer,
        question_source: q.question_source,
        section_name: q.section_name,
        section_type: q.section_type,
        section_label: q.section_label || null,
        display_order: q.display_order,
        question_bank_id: q.question_bank_id || null,
        interview_kit_question_id: q.interview_kit_question_id || null,
        proof_point_id: q.proof_point_id || null,
        rating: null,
        score: 0,
        comments: null,
      }));

      // Add audit fields to all responses
      const responsesWithAudit = await Promise.all(
        responsesToInsert.map(r => withCreatedBy(r))
      );

      const { error: insertError } = await supabase
        .from('interview_question_responses')
        .insert(responsesWithAudit);

      if (insertError) throw new Error(insertError.message);

      return {
        evaluationId: newEval.id,
        questionCount: allQuestions.length,
      };
    },
    onSuccess: (result, params) => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit', params.bookingId] });
      toast.success(`Interview kit generated with ${result.questionCount} questions`);
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'generate_interview_kit' });
    },
  });
}

// =====================================================
// Update Response Rating
// =====================================================

/**
 * Update a question response (rating and/or comments)
 */
export function useUpdateInterviewResponse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateResponseParams) => {
      const { responseId, rating, comments } = params;

      const updateData: Record<string, any> = {};

      if (rating !== undefined) {
        updateData.rating = rating;
        updateData.score = rating ? RATING_VALUES[rating] : 0;
      }

      if (comments !== undefined) {
        updateData.comments = comments;
      }

      const dataWithAudit = await withUpdatedBy(updateData);

      const { error } = await supabase
        .from('interview_question_responses')
        .update(dataWithAudit)
        .eq('id', responseId);

      if (error) throw new Error(error.message);
    },
    onMutate: async (params) => {
      // Optimistic update - update cache immediately
      // Note: We don't cancel queries here to allow background sync
    },
    onSuccess: () => {
      // Invalidate to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['interview-kit'] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_interview_response' });
    },
  });
}

// =====================================================
// Add Custom Question
// =====================================================

/**
 * Add a custom reviewer question to the interview kit
 */
export function useAddCustomQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: AddCustomQuestionParams) => {
      const { evaluationId, questionText, expectedAnswer, sectionName, sectionType } = params;

      // Get max display_order for this section
      const { data: existing } = await supabase
        .from('interview_question_responses')
        .select('display_order')
        .eq('evaluation_id', evaluationId)
        .eq('section_type', sectionType)
        .order('display_order', { ascending: false })
        .limit(1);

      const maxOrder = existing?.[0]?.display_order || 0;

      const responseData = await withCreatedBy({
        evaluation_id: evaluationId,
        question_text: questionText,
        expected_answer: expectedAnswer,
        question_source: 'reviewer_custom',
        section_name: sectionName,
        section_type: sectionType,
        display_order: maxOrder + 1,
        rating: null,
        score: 0,
        comments: null,
      });

      const { data, error } = await supabase
        .from('interview_question_responses')
        .insert(responseData)
        .select()
        .single();

      if (error) throw new Error(error.message);
      return data as InterviewQuestionResponse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit'] });
      toast.success('Question added successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'add_custom_question' });
    },
  });
}

// =====================================================
// Edit Question
// =====================================================

/**
 * Edit an existing question's text and expected answer
 */
export function useEditInterviewQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateQuestionParams) => {
      const { responseId, questionText, expectedAnswer } = params;

      const updateData = await withUpdatedBy({
        question_text: questionText,
        expected_answer: expectedAnswer,
      });

      const { error } = await supabase
        .from('interview_question_responses')
        .update(updateData)
        .eq('id', responseId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit'] });
      toast.success('Question updated successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'edit_interview_question' });
    },
  });
}

// =====================================================
// Delete Question (Soft Delete)
// =====================================================

/**
 * Soft delete a question from the interview kit
 */
export function useDeleteInterviewQuestion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (responseId: string) => {
      const updateData = await withUpdatedBy({
        is_deleted: true,
      });

      const { error } = await supabase
        .from('interview_question_responses')
        .update(updateData)
        .eq('id', responseId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit'] });
      toast.success('Question removed');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_interview_question' });
    },
  });
}

// =====================================================
// Submit Interview Evaluation
// =====================================================

export interface SubmitEvaluationParams {
  evaluationId: string;
  bookingId: string;
  overallScore: number;
  scorePercentage: number;
  outcome: string;
  notes?: string;
}

/**
 * Submit the completed interview evaluation
 */
export function useSubmitInterviewEvaluation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SubmitEvaluationParams) => {
      const { evaluationId, bookingId, overallScore, scorePercentage, outcome, notes } = params;

      const userId = await getCurrentUserId();

      // Update evaluation with final score
      const evalUpdate = await withUpdatedBy({
        overall_score: overallScore,
        outcome,
        notes: notes || null,
        evaluated_at: new Date().toISOString(),
      });

      const { error: evalError } = await supabase
        .from('interview_evaluations')
        .update(evalUpdate)
        .eq('id', evaluationId);

      if (evalError) throw new Error(evalError.message);

      // Update interview_bookings with score summary
      // Count responses for this evaluation
      const { data: responses } = await supabase
        .from('interview_question_responses')
        .select('rating')
        .eq('evaluation_id', evaluationId)
        .eq('is_deleted', false);

      const totalQuestions = responses?.length || 0;
      const correctCount = responses?.filter(r => r.rating === 'right').length || 0;

      const bookingUpdate = await withUpdatedBy({
        interview_score_percentage: scorePercentage,
        interview_score_out_of_10: Math.round(scorePercentage / 10),
        interview_total_questions: totalQuestions,
        interview_correct_count: correctCount,
        interview_outcome: outcome,
        panel_recommendation: outcome,
        interview_submitted_at: new Date().toISOString(),
        interview_submitted_by: userId,
      });

      const { error: bookingError } = await supabase
        .from('interview_bookings')
        .update(bookingUpdate)
        .eq('id', bookingId);

      if (bookingError) {
        logWarning('Failed to update booking with interview scores', {
          operation: 'submit_interview_evaluation',
          component: 'useInterviewKit',
        });
      }
    },
    onSuccess: (_, params) => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit', params.bookingId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-candidates'] });
      toast.success('Interview evaluation submitted successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_interview_evaluation' });
    },
  });
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Get grouped responses by section for display
 */
export function groupResponsesBySection(
  responses: InterviewQuestionResponse[]
): Map<string, InterviewQuestionResponse[]> {
  const grouped = new Map<string, InterviewQuestionResponse[]>();

  for (const response of responses) {
    const key = response.section_name;
    const existing = grouped.get(key) || [];
    existing.push(response);
    grouped.set(key, existing);
  }

  // Sort each group by display_order
  for (const [key, items] of grouped) {
    items.sort((a, b) => a.display_order - b.display_order);
    grouped.set(key, items);
  }

  return grouped;
}
