/**
 * Enrollment Assessment Hooks
 * 
 * React Query hooks for enrollment-scoped assessment management.
 * Includes sequential assessment rule that blocks concurrent attempts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUserId } from '@/lib/auditFields';

// Assessment configuration
const DEFAULT_TIME_LIMIT_MINUTES = 60;
const DEFAULT_QUESTIONS_PER_ASSESSMENT = 20;
const PASSING_SCORE_PERCENTAGE = 70;

export interface StartEnrollmentAssessmentInput {
  enrollmentId: string;
  providerId: string;
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
 * Start assessment for a specific enrollment
 */
export function useStartEnrollmentAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: StartEnrollmentAssessmentInput) => {
      const { 
        enrollmentId, 
        providerId, 
        questionsCount = DEFAULT_QUESTIONS_PER_ASSESSMENT, 
        timeLimitMinutes = DEFAULT_TIME_LIMIT_MINUTES 
      } = input;

      const userId = await getCurrentUserId();
      if (!userId) {
        return { success: false, error: 'Not authenticated' };
      }

      // Create assessment attempt with enrollment_id
      const { data: attempt, error: attemptError } = await supabase
        .from('assessment_attempts')
        .insert({
          provider_id: providerId,
          enrollment_id: enrollmentId,
          total_questions: questionsCount,
          time_limit_minutes: timeLimitMinutes,
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (attemptError) {
        return { success: false, error: 'Failed to start assessment' };
      }

      // Update enrollment lifecycle to assessment_in_progress
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
        // Rollback: delete the attempt
        await supabase.from('assessment_attempts').delete().eq('id', attempt.id);
        return { success: false, error: 'Failed to update enrollment lifecycle' };
      }

      return { 
        success: true, 
        attemptId: attempt.id,
        questionsCount,
        timeLimitMinutes,
      };
    },
    onSuccess: (result, variables) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment'] });
        queryClient.invalidateQueries({ queryKey: ['can-start-enrollment-assessment'] });
        queryClient.invalidateQueries({ queryKey: ['active-enrollment-assessment-attempt'] });
        queryClient.invalidateQueries({ queryKey: ['active-assessment-any-enrollment'] });
        
        toast.success('Assessment started! Your configuration is now locked.');
      } else {
        toast.error(result.error || 'Failed to start assessment');
      }
    },
    onError: (error: Error) => {
      toast.error(`Failed to start assessment: ${error.message}`);
    },
  });
}
