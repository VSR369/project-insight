/**
 * Interview Kit Session Hooks
 * Manages interview kit question generation, ratings, and submission
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { handleMutationError } from "@/lib/errorHandler";
import { withCreatedBy, withUpdatedBy, getCurrentUserId } from "@/lib/auditFields";
import { toast } from "sonner";
import { 
  generateInterviewKitQuestions,
  type GeneratedQuestion 
} from "@/services/interviewQuestionGenerationService";
import {
  RATING_SCORES,
  getRecommendation,
  type RatingType,
  type RecommendationType,
} from "@/constants/interview-kit.constants";

// =====================================================
// Types
// =====================================================

export interface InterviewQuestion {
  id: string;
  questionText: string;
  expectedAnswer: string | null;
  source: 'question_bank' | 'proof_point' | 'interview_kit' | 'reviewer_custom';
  sectionType: string;
  sectionLabel: string;
  displayOrder: number;
  rating: RatingType | null;
  score: number;
  comments: string;
  isEditable: boolean;
  validationError: string | null;
  // Source references
  questionBankId: string | null;
  proofPointId: string | null;
  interviewKitQuestionId: string | null;
}

export interface InterviewSection {
  type: string;
  label: string;
  questions: InterviewQuestion[];
  sectionScore: number;
  sectionMaxScore: number;
  ratedCount: number;
}

export interface InterviewKitSession {
  // Header stats
  totalQuestions: number;
  ratedCount: number;
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  sectionCount: number;
  recommendation: RecommendationType;
  
  // Distribution
  rightCount: number;
  wrongCount: number;
  notAnsweredCount: number;
  
  // Questions grouped by section
  sections: InterviewSection[];
  
  // Submit state
  isSubmitted: boolean;
  submittedAt: string | null;
  canSubmit: boolean;
  validationErrors: string[];
  
  // Booking/Evaluation context
  bookingId: string | null;
  evaluationId: string | null;
  reviewerId: string | null;
}

// =====================================================
// Query Hook
// =====================================================

export function useInterviewKitSession(enrollmentId: string, bookingId?: string | null) {
  return useQuery({
    queryKey: ['interview-kit-session', enrollmentId, bookingId],
    queryFn: async (): Promise<InterviewKitSession> => {
      // Get enrollment context
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select('industry_segment_id, expertise_level_id')
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError || !enrollment) {
        throw new Error(enrollmentError?.message || 'Enrollment not found');
      }

      // Check for existing interview evaluation
      let evaluationId: string | null = null;
      let reviewerId: string | null = null;
      let existingResponses: any[] = [];
      let isSubmitted = false;
      let submittedAt: string | null = null;

      if (bookingId) {
        // Get reviewer ID from current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: reviewer } = await supabase
            .from('panel_reviewers')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .single();
          
          if (reviewer) {
            reviewerId = reviewer.id;

            // Check for existing evaluation
            const { data: evaluation } = await supabase
              .from('interview_evaluations')
              .select('id, evaluated_at')
              .eq('booking_id', bookingId)
              .eq('reviewer_id', reviewerId)
              .maybeSingle();

            if (evaluation) {
              evaluationId = evaluation.id;
              isSubmitted = !!evaluation.evaluated_at;
              submittedAt = evaluation.evaluated_at;

              // Fetch existing responses
              const { data: responses } = await supabase
                .from('interview_question_responses')
                .select('*')
                .eq('evaluation_id', evaluationId)
                .eq('is_deleted', false)
                .order('section_type')
                .order('display_order');

              existingResponses = responses || [];
            }
          }
        }
      }

      // If we have existing responses, use them; otherwise generate new questions
      let sections: InterviewSection[] = [];

      if (existingResponses.length > 0) {
        // Group existing responses by section
        const sectionMap = new Map<string, InterviewQuestion[]>();
        
        for (const r of existingResponses) {
          const question: InterviewQuestion = {
            id: r.id,
            questionText: r.question_text,
            expectedAnswer: r.expected_answer,
            source: r.question_source,
            sectionType: r.section_type || r.section_name,
            sectionLabel: r.section_label || r.section_name,
            displayOrder: r.display_order,
            rating: r.rating as RatingType | null,
            score: r.score || 0,
            comments: r.comments || '',
            isEditable: r.question_source === 'reviewer_custom',
            validationError: null,
            questionBankId: r.question_bank_id,
            proofPointId: r.proof_point_id,
            interviewKitQuestionId: r.interview_kit_question_id,
          };

          const existing = sectionMap.get(question.sectionType) || [];
          existing.push(question);
          sectionMap.set(question.sectionType, existing);
        }

        // Build sections array
        for (const [type, questions] of sectionMap) {
          const label = questions[0]?.sectionLabel || type;
          const sectionScore = questions.reduce((sum, q) => sum + q.score, 0);
          const sectionMaxScore = questions.length * 5;
          const ratedCount = questions.filter(q => q.rating !== null).length;

          sections.push({
            type,
            label,
            questions: questions.sort((a, b) => a.displayOrder - b.displayOrder),
            sectionScore,
            sectionMaxScore,
            ratedCount,
          });
        }
      } else {
        // Generate new questions
        const generated = await generateInterviewKitQuestions(
          enrollmentId,
          enrollment.industry_segment_id,
          enrollment.expertise_level_id || ''
        );

        sections = generated.sections.map(s => ({
          type: s.type,
          label: s.label,
          questions: s.questions.map(q => ({
            id: '', // Will be assigned on save
            questionText: q.questionText,
            expectedAnswer: q.expectedAnswer,
            source: q.source,
            sectionType: q.sectionType,
            sectionLabel: q.sectionLabel,
            displayOrder: q.displayOrder,
            rating: null,
            score: 0,
            comments: '',
            isEditable: q.source === 'reviewer_custom',
            validationError: null,
            questionBankId: q.questionBankId || null,
            proofPointId: q.proofPointId || null,
            interviewKitQuestionId: q.interviewKitQuestionId || null,
          })),
          sectionScore: 0,
          sectionMaxScore: s.questions.length * 5,
          ratedCount: 0,
        }));
      }

      // Calculate stats
      const allQuestions = sections.flatMap(s => s.questions);
      const totalQuestions = allQuestions.length;
      const ratedCount = allQuestions.filter(q => q.rating !== null).length;
      const rightCount = allQuestions.filter(q => q.rating === 'right').length;
      const wrongCount = allQuestions.filter(q => q.rating === 'wrong').length;
      const notAnsweredCount = allQuestions.filter(q => q.rating === 'not_answered').length;
      
      const totalScore = allQuestions.reduce((sum, q) => sum + q.score, 0);
      const maxScore = totalQuestions * 5;
      const scorePercentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;
      const recommendation = getRecommendation(scorePercentage);

      // Validate for submission
      const validationErrors: string[] = [];
      
      // Check all questions are rated
      const unratedQuestions = allQuestions.filter(q => q.rating === null);
      if (unratedQuestions.length > 0) {
        validationErrors.push(`${unratedQuestions.length} question(s) not rated`);
      }

      // Check comments for wrong/not_answered
      const missingComments = allQuestions.filter(q => 
        (q.rating === 'wrong' || q.rating === 'not_answered') && 
        (!q.comments || q.comments.trim() === '')
      );
      if (missingComments.length > 0) {
        validationErrors.push(`Comments required for ${missingComments.length} Wrong/Not Answered question(s)`);
      }

      // Update validation errors on questions
      for (const section of sections) {
        for (const q of section.questions) {
          if ((q.rating === 'wrong' || q.rating === 'not_answered') && 
              (!q.comments || q.comments.trim() === '')) {
            q.validationError = 'Comments required';
          }
        }
      }

      return {
        totalQuestions,
        ratedCount,
        totalScore,
        maxScore,
        scorePercentage,
        sectionCount: sections.length,
        recommendation,
        rightCount,
        wrongCount,
        notAnsweredCount,
        sections,
        isSubmitted,
        submittedAt,
        canSubmit: validationErrors.length === 0 && totalQuestions > 0,
        validationErrors,
        bookingId: bookingId || null,
        evaluationId,
        reviewerId,
      };
    },
    enabled: !!enrollmentId,
    staleTime: 30000,
    refetchOnWindowFocus: false,
  });
}

// =====================================================
// Mutation: Initialize Interview Kit (save generated questions)
// =====================================================

export function useInitializeInterviewKit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      bookingId, 
      enrollmentId,
      questions 
    }: { 
      bookingId: string;
      enrollmentId: string;
      questions: InterviewQuestion[];
    }) => {
      const userId = await getCurrentUserId();
      
      // Get reviewer ID
      const { data: reviewer, error: reviewerError } = await supabase
        .from('panel_reviewers')
        .select('id')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single();

      if (reviewerError || !reviewer) {
        throw new Error('Reviewer not found');
      }

      // Create or get evaluation
      let evaluationId: string;
      
      const { data: existingEval } = await supabase
        .from('interview_evaluations')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('reviewer_id', reviewer.id)
        .maybeSingle();

      if (existingEval) {
        evaluationId = existingEval.id;
      } else {
        const { data: newEval, error: evalError } = await supabase
          .from('interview_evaluations')
          .insert({
            booking_id: bookingId,
            reviewer_id: reviewer.id,
            created_by: userId,
          })
          .select('id')
          .single();

        if (evalError) throw new Error(evalError.message);
        evaluationId = newEval.id;
      }

      // Insert questions
      const questionsToInsert = questions.map(q => ({
        evaluation_id: evaluationId,
        question_source: q.source,
        question_bank_id: q.questionBankId,
        proof_point_id: q.proofPointId,
        interview_kit_question_id: q.interviewKitQuestionId,
        section_type: q.sectionType,
        section_label: q.sectionLabel,
        section_name: q.sectionLabel, // For backward compatibility
        question_text: q.questionText,
        expected_answer: q.expectedAnswer,
        display_order: q.displayOrder,
        rating: null,
        score: 0,
        comments: null,
        created_by: userId,
      }));

      const { error: insertError } = await supabase
        .from('interview_question_responses')
        .insert(questionsToInsert);

      if (insertError) throw new Error(insertError.message);

      return { evaluationId };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit-session', variables.enrollmentId] });
      toast.success('Interview Kit initialized');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'initialize_interview_kit' });
    },
  });
}

// =====================================================
// Mutation: Save Question Rating
// =====================================================

export function useSaveQuestionRating(enrollmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      questionId, 
      rating, 
      comments 
    }: { 
      questionId: string; 
      rating: RatingType; 
      comments?: string;
    }) => {
      const score = RATING_SCORES[rating];
      const updatesWithAudit = await withUpdatedBy({
        rating,
        score,
        comments: comments || null,
      });

      const { error } = await supabase
        .from('interview_question_responses')
        .update(updatesWithAudit)
        .eq('id', questionId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit-session', enrollmentId] });
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'save_question_rating' });
    },
  });
}

// =====================================================
// Mutation: Add Custom Question
// =====================================================

export function useAddCustomQuestion(enrollmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      evaluationId,
      sectionType,
      sectionLabel,
      questionText,
      expectedAnswer,
    }: { 
      evaluationId: string;
      sectionType: string;
      sectionLabel: string;
      questionText: string;
      expectedAnswer?: string;
    }) => {
      const dataWithAudit = await withCreatedBy({
        evaluation_id: evaluationId,
        question_source: 'reviewer_custom',
        section_type: sectionType,
        section_label: sectionLabel,
        section_name: sectionLabel,
        question_text: questionText,
        expected_answer: expectedAnswer || null,
        display_order: 999, // Will be at end
        rating: null,
        score: 0,
      });

      const { data, error } = await supabase
        .from('interview_question_responses')
        .insert(dataWithAudit)
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit-session', enrollmentId] });
      toast.success('Question added');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'add_custom_question' });
    },
  });
}

// =====================================================
// Mutation: Update Question Text (custom only)
// =====================================================

export function useUpdateQuestionText(enrollmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      questionId, 
      questionText, 
      expectedAnswer 
    }: { 
      questionId: string; 
      questionText: string; 
      expectedAnswer?: string;
    }) => {
      const updatesWithAudit = await withUpdatedBy({
        question_text: questionText,
        expected_answer: expectedAnswer || null,
      });

      const { error } = await supabase
        .from('interview_question_responses')
        .update(updatesWithAudit)
        .eq('id', questionId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit-session', enrollmentId] });
      toast.success('Question updated');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'update_question_text' });
    },
  });
}

// =====================================================
// Mutation: Delete Question (soft)
// =====================================================

export function useDeleteInterviewQuestion(enrollmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questionId: string) => {
      const updatesWithAudit = await withUpdatedBy({
        is_deleted: true,
      });

      const { error } = await supabase
        .from('interview_question_responses')
        .update(updatesWithAudit)
        .eq('id', questionId);

      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit-session', enrollmentId] });
      toast.success('Question removed');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'delete_interview_question' });
    },
  });
}

// =====================================================
// Mutation: Submit Interview
// =====================================================

export function useSubmitInterview(enrollmentId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      evaluationId,
      bookingId,
      totalScore,
      maxScore,
      scorePercentage,
      recommendation,
    }: { 
      evaluationId: string;
      bookingId: string;
      totalScore: number;
      maxScore: number;
      scorePercentage: number;
      recommendation: RecommendationType;
    }) => {
      const userId = await getCurrentUserId();
      const now = new Date().toISOString();

      // Update evaluation
      const { error: evalError } = await supabase
        .from('interview_evaluations')
        .update({
          overall_score: scorePercentage / 10, // Convert to /10 scale
          outcome: recommendation,
          evaluated_at: now,
          updated_by: userId,
          updated_at: now,
        })
        .eq('id', evaluationId);

      if (evalError) throw new Error(evalError.message);

      // Update booking with score
      const totalQuestions = Math.round(maxScore / 5);
      const correctCount = Math.round(totalScore / 5);

      const { error: bookingError } = await supabase
        .from('interview_bookings')
        .update({
          interview_score_percentage: scorePercentage,
          interview_score_out_of_10: scorePercentage / 10,
          interview_total_questions: totalQuestions,
          interview_correct_count: correctCount,
          panel_recommendation: recommendation,
          interview_submitted_at: now,
          interview_submitted_by: userId,
          interview_outcome: recommendation,
          updated_by: userId,
          updated_at: now,
        })
        .eq('id', bookingId);

      if (bookingError) throw new Error(bookingError.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interview-kit-session', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-detail'] });
      queryClient.invalidateQueries({ queryKey: ['reviewer-candidates'] });
      toast.success('Interview submitted successfully');
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'submit_interview' });
    },
  });
}
