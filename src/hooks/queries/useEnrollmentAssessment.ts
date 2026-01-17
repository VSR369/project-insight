/**
 * Enrollment Assessment Hooks
 * 
 * React Query hooks for enrollment-scoped assessment management.
 * Includes sequential assessment rule that blocks concurrent attempts.
 * Integrates balanced random question generation.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';
import { 
  generateBalancedQuestions, 
  logQuestionExposure,
  type QuestionWithMetadata 
} from '@/services/questionGenerationService';

// Assessment configuration
const DEFAULT_TIME_LIMIT_MINUTES = 60;
const DEFAULT_QUESTIONS_PER_ASSESSMENT = 20;
const PASSING_SCORE_PERCENTAGE = 70;

export interface StartEnrollmentAssessmentInput {
  enrollmentId: string;
  providerId: string;
  industrySegmentId: string;
  expertiseLevelId: string;
  questionsCount?: number;
  timeLimitMinutes?: number;
}

export interface EnrollmentAssessmentAttempt {
  id: string;
  provider_id: string;
  enrollment_id: string | null;
  total_questions: number;
  answered_questions: number | null;
  time_limit_minutes: number;
  started_at: string;
  submitted_at: string | null;
  score_percentage: number | null;
  is_passed: boolean | null;
}

export interface ActiveAssessmentInfo {
  attemptId: string;
  enrollmentId: string;
  industryName?: string;
  startedAt: string;
}

export interface StartAssessmentResult {
  success: boolean;
  error?: string;
  attemptId?: string;
  questions?: QuestionWithMetadata[];
  questionsCount?: number;
  timeLimitMinutes?: number;
  generationWarnings?: string[];
}

/**
 * Check if provider has any active assessment across all enrollments (sequential rule)
 */
export function useActiveAssessmentAcrossEnrollments(providerId?: string) {
  return useQuery({
    queryKey: ['active-assessment-any-enrollment', providerId],
    queryFn: async (): Promise<ActiveAssessmentInfo | null> => {
      if (!providerId) return null;

      // Find any unsubmitted assessment attempt
      const { data: activeAttempt, error } = await supabase
        .from('assessment_attempts')
        .select(`
          id,
          enrollment_id,
          started_at,
          time_limit_minutes
        `)
        .eq('provider_id', providerId)
        .is('submitted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !activeAttempt) return null;

      // Check if expired
      const startedAt = new Date(activeAttempt.started_at);
      const expiresAt = new Date(startedAt.getTime() + activeAttempt.time_limit_minutes * 60 * 1000);
      if (new Date() >= expiresAt) {
        return null; // Expired, doesn't count
      }

      // Get industry name for the enrollment
      let industryName: string | undefined;
      if (activeAttempt.enrollment_id) {
        const { data: enrollment } = await supabase
          .from('provider_industry_enrollments')
          .select('industry_segment_id')
          .eq('id', activeAttempt.enrollment_id)
          .single();

        if (enrollment?.industry_segment_id) {
          const { data: industry } = await supabase
            .from('industry_segments')
            .select('name')
            .eq('id', enrollment.industry_segment_id)
            .single();
          industryName = industry?.name;
        }
      }

      return {
        attemptId: activeAttempt.id,
        enrollmentId: activeAttempt.enrollment_id || '',
        industryName,
        startedAt: activeAttempt.started_at,
      };
    },
    enabled: !!providerId,
    staleTime: 5000,
  });
}

/**
 * Check if a specific enrollment can start an assessment
 * 
 * Requirements:
 * - Must have minimum proof points met (enrollment lifecycle_rank >= 70)
 * - No active (unsubmitted) assessment attempt for ANY enrollment (sequential rule)
 * - This enrollment not already in or past assessment
 */
export function useCanStartEnrollmentAssessment(enrollmentId?: string, providerId?: string) {
  return useQuery({
    queryKey: ['can-start-enrollment-assessment', enrollmentId, providerId],
    queryFn: async (): Promise<{ allowed: boolean; reason?: string; otherEnrollmentId?: string }> => {
      if (!enrollmentId || !providerId) {
        return { allowed: false, reason: 'Missing enrollment or provider' };
      }

      // Get enrollment's lifecycle status
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select('lifecycle_status, lifecycle_rank')
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError || !enrollment) {
        return { allowed: false, reason: 'Enrollment not found' };
      }

      // Must have minimum proof points (rank 70+)
      if (enrollment.lifecycle_rank < 70) {
        return { 
          allowed: false, 
          reason: 'Complete your proof points before starting the assessment' 
        };
      }

      // Cannot already be in or past assessment for this enrollment
      if (enrollment.lifecycle_rank >= 100) {
        return { 
          allowed: false, 
          reason: 'Assessment already in progress or completed for this industry' 
        };
      }

      // SEQUENTIAL RULE: Check for active assessment in ANY enrollment
      const { data: activeAttempt } = await supabase
        .from('assessment_attempts')
        .select('id, enrollment_id, started_at, time_limit_minutes')
        .eq('provider_id', providerId)
        .is('submitted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeAttempt) {
        // Check if expired
        const startedAt = new Date(activeAttempt.started_at);
        const expiresAt = new Date(startedAt.getTime() + activeAttempt.time_limit_minutes * 60 * 1000);
        
        if (new Date() < expiresAt) {
          // Active assessment exists
          if (activeAttempt.enrollment_id === enrollmentId) {
            return { 
              allowed: false, 
              reason: 'You have an active assessment in progress for this industry' 
            };
          } else {
            return { 
              allowed: false, 
              reason: 'Please complete your assessment for another industry before starting this one',
              otherEnrollmentId: activeAttempt.enrollment_id || undefined,
            };
          }
        }
      }

      return { allowed: true };
    },
    enabled: !!enrollmentId && !!providerId,
    staleTime: 10000,
  });
}

/**
 * Get active assessment attempt for a specific enrollment
 */
export function useActiveEnrollmentAssessmentAttempt(enrollmentId?: string) {
  return useQuery({
    queryKey: ['active-enrollment-assessment-attempt', enrollmentId],
    queryFn: async (): Promise<EnrollmentAssessmentAttempt | null> => {
      if (!enrollmentId) return null;

      const { data, error } = await supabase
        .from('assessment_attempts')
        .select('*')
        .eq('enrollment_id', enrollmentId)
        .is('submitted_at', null)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) return null;
      return data as EnrollmentAssessmentAttempt | null;
    },
    enabled: !!enrollmentId,
    staleTime: 5000,
  });
}

/**
 * Check if enrollment is in a terminal state (assessment completed/passed)
 */
export function useEnrollmentIsTerminal(enrollmentId?: string) {
  return useQuery({
    queryKey: ['enrollment-is-terminal', enrollmentId],
    queryFn: async (): Promise<{ isTerminal: boolean; status?: string }> => {
      if (!enrollmentId) return { isTerminal: false };

      const { data: enrollment, error } = await supabase
        .from('provider_industry_enrollments')
        .select('lifecycle_status, lifecycle_rank')
        .eq('id', enrollmentId)
        .single();

      if (error || !enrollment) return { isTerminal: false };

      // Terminal states: assessment_passed or higher
      const isTerminal = enrollment.lifecycle_rank >= 110;
      return { isTerminal, status: enrollment.lifecycle_status };
    },
    enabled: !!enrollmentId,
    staleTime: 10000,
  });
}

/**
 * Start assessment for a specific enrollment with balanced question generation
 */
export function useStartEnrollmentAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StartEnrollmentAssessmentInput): Promise<StartAssessmentResult> => {
      const { 
        enrollmentId, 
        providerId,
        industrySegmentId,
        expertiseLevelId,
        questionsCount = DEFAULT_QUESTIONS_PER_ASSESSMENT, 
        timeLimitMinutes = DEFAULT_TIME_LIMIT_MINUTES 
      } = input;

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Not authenticated' };
      }

      // Step 1: Generate balanced questions
      const generationResult = await generateBalancedQuestions({
        providerId,
        enrollmentId,
        industrySegmentId,
        expertiseLevelId,
        questionsCount,
      });

      if (!generationResult.success || generationResult.questions.length === 0) {
        return { 
          success: false, 
          error: generationResult.warnings.join('; ') || 'No eligible questions found' 
        };
      }

      const actualQuestionsCount = generationResult.questions.length;

      // Step 2: Create assessment attempt with enrollment_id
      const { data: attempt, error: attemptError } = await supabase
        .from('assessment_attempts')
        .insert({
          provider_id: providerId,
          enrollment_id: enrollmentId,
          total_questions: actualQuestionsCount,
          time_limit_minutes: timeLimitMinutes,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (attemptError) {
        return { success: false, error: 'Failed to start assessment' };
      }

      // Step 3: Create assessment response records for each question
      const responseRecords = generationResult.questions.map((q, index) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        selected_option: null,
        is_correct: null,
        answered_at: null,
      }));

      const { error: responsesError } = await supabase
        .from('assessment_attempt_responses')
        .insert(responseRecords);

      if (responsesError) {
        // Rollback: delete the attempt
        await supabase.from('assessment_attempts').delete().eq('id', attempt.id);
        return { success: false, error: 'Failed to prepare assessment questions' };
      }

      // Step 4: Log question exposure to prevent future repetition
      await logQuestionExposure(
        providerId,
        attempt.id,
        generationResult.questions.map(q => q.id)
      );

      // Step 5: Update enrollment lifecycle to assessment_in_progress
      const { error: updateError } = await supabase
        .from('provider_industry_enrollments')
        .update({
          lifecycle_status: 'assessment_in_progress',
          lifecycle_rank: 100,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (updateError) {
        // Rollback: delete the attempt and responses
        await supabase.from('assessment_attempt_responses').delete().eq('attempt_id', attempt.id);
        await supabase.from('assessment_attempts').delete().eq('id', attempt.id);
        return { success: false, error: 'Failed to update enrollment lifecycle' };
      }

      return { 
        success: true, 
        attemptId: attempt.id,
        questions: generationResult.questions,
        questionsCount: actualQuestionsCount,
        timeLimitMinutes,
        generationWarnings: generationResult.warnings,
      };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        // Cache the generated questions
        queryClient.setQueryData(
          ['assessment-questions', variables.enrollmentId],
          result.questions
        );
        
        queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['can-start-enrollment-assessment'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment-assessment-attempt'] });
        queryClient.invalidateQueries({ queryKey: ['active-assessment-any-enrollment'] });
        
        toast.success(`Assessment started with ${result.questionsCount} questions! Your configuration is now locked.`);
        
        if (result.generationWarnings && result.generationWarnings.length > 0) {
          console.warn('Assessment generation warnings:', result.generationWarnings);
        }
      } else {
        toast.error(result.error || 'Failed to start assessment');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to start assessment: ${error.message}`);
    },
  });
}

/**
 * Hook to fetch questions for an active assessment attempt
 */
export function useAssessmentAttemptQuestions(attemptId?: string) {
  return useQuery({
    queryKey: ['assessment-attempt-questions', attemptId],
    queryFn: async () => {
      if (!attemptId) return [];

      const { data, error } = await supabase
        .from('assessment_attempt_responses')
        .select(`
          id,
          question_id,
          selected_option,
          is_correct,
          answered_at,
          question_bank (
            id,
            question_text,
            options,
            correct_option,
            difficulty,
            question_type,
            speciality_id,
            specialities (
              name,
              sub_domains (
                name,
                proficiency_areas (
                  name
                )
              )
            )
          )
        `)
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    enabled: !!attemptId,
    staleTime: 30000,
  });
}

/**
 * Save a single assessment answer (autosave)
 */
export function useSaveAssessmentAnswer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      attemptId, 
      questionId, 
      selectedOption 
    }: { 
      attemptId: string; 
      questionId: string; 
      selectedOption: number;
    }) => {
      // Update the response
      const { error: updateError } = await supabase
        .from('assessment_attempt_responses')
        .update({
          selected_option: selectedOption,
          answered_at: new Date().toISOString(),
        })
        .eq('attempt_id', attemptId)
        .eq('question_id', questionId);

      if (updateError) throw updateError;

      // Update answered_questions count in attempt
      const { data: responses } = await supabase
        .from('assessment_attempt_responses')
        .select('selected_option')
        .eq('attempt_id', attemptId);

      const answeredCount = responses?.filter(r => r.selected_option !== null).length || 0;

      const { error: countError } = await supabase
        .from('assessment_attempts')
        .update({ answered_questions: answeredCount })
        .eq('id', attemptId);

      if (countError) throw countError;

      return { success: true, answeredCount };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['assessment-attempt-questions', variables.attemptId] 
      });
    },
  });
}

/**
 * Submit an assessment and calculate score
 */
export function useSubmitEnrollmentAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      attemptId, 
      enrollmentId 
    }: { 
      attemptId: string; 
      enrollmentId: string;
    }) => {
      const userId = await getCurrentUserId();

      // Get all responses with correct answers
      const { data: responses, error: responsesError } = await supabase
        .from('assessment_attempt_responses')
        .select(`
          id,
          question_id,
          selected_option,
          question_bank!inner (
            correct_option
          )
        `)
        .eq('attempt_id', attemptId);

      if (responsesError) throw responsesError;

      // Calculate score
      let correctCount = 0;
      const totalCount = responses?.length || 0;

      // Update is_correct for each response
      for (const response of responses || []) {
        const isCorrect = response.selected_option === response.question_bank.correct_option;
        if (isCorrect) correctCount++;

        await supabase
          .from('assessment_attempt_responses')
          .update({ is_correct: isCorrect })
          .eq('id', response.id);
      }

      const scorePercentage = totalCount > 0 ? Math.round((correctCount / totalCount) * 100) : 0;
      const isPassed = scorePercentage >= PASSING_SCORE_PERCENTAGE;

      // Update attempt with results
      const { error: attemptError } = await supabase
        .from('assessment_attempts')
        .update({
          submitted_at: new Date().toISOString(),
          score_percentage: scorePercentage,
          is_passed: isPassed,
          answered_questions: responses?.filter(r => r.selected_option !== null).length || 0,
        })
        .eq('id', attemptId);

      if (attemptError) throw attemptError;

      // Update enrollment lifecycle based on pass/fail
      const newLifecycleStatus = isPassed ? 'assessment_passed' : 'assessment_completed';
      const newLifecycleRank = isPassed ? 110 : 105;

      const { error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .update({
          lifecycle_status: newLifecycleStatus,
          lifecycle_rank: newLifecycleRank,
          updated_by: userId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', enrollmentId);

      if (enrollmentError) throw enrollmentError;

      return { 
        success: true, 
        scorePercentage, 
        isPassed, 
        correctCount, 
        totalCount 
      };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['assessment-attempt-questions'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment-assessment-attempt'] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment-is-terminal'] });
      queryClient.invalidateQueries({ queryKey: ['can-start-enrollment-assessment'] });
      queryClient.invalidateQueries({ queryKey: ['active-assessment-any-enrollment'] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to submit assessment: ${error.message}`);
    },
  });
}
