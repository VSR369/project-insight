/**
 * Assessment Hooks
 * 
 * React Query hooks for assessment management
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  canStartAssessment,
  startAssessment,
  getActiveAssessmentAttempt,
  submitAssessment,
  getAssessmentHistory,
  type StartAssessmentInput,
  type AssessmentAttempt,
} from '@/services/assessmentService';

/**
 * Check if current provider can start an assessment
 */
export function useCanStartAssessment(providerId?: string) {
  return useQuery({
    queryKey: ['can-start-assessment', providerId],
    queryFn: () => canStartAssessment(providerId!),
    enabled: !!providerId,
    staleTime: 10000, // 10 seconds
  });
}

/**
 * Get active (in-progress) assessment attempt
 */
export function useActiveAssessmentAttempt(providerId?: string) {
  return useQuery({
    queryKey: ['active-assessment-attempt', providerId],
    queryFn: () => getActiveAssessmentAttempt(providerId!),
    enabled: !!providerId,
    staleTime: 5000, // 5 seconds - check frequently during assessment
  });
}

/**
 * Get assessment history for a provider
 */
export function useAssessmentHistory(providerId?: string) {
  return useQuery({
    queryKey: ['assessment-history', providerId],
    queryFn: () => getAssessmentHistory(providerId!),
    enabled: !!providerId,
    staleTime: 30000,
  });
}

/**
 * Start a new assessment
 * 
 * This triggers the configuration lock by transitioning
 * the provider to assessment_in_progress (rank 100)
 */
export function useStartAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: StartAssessmentInput) => startAssessment(input),
    onSuccess: (result, variables) => {
      if (result.success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
        queryClient.invalidateQueries({ queryKey: ['can-start-assessment', variables.providerId] });
        queryClient.invalidateQueries({ queryKey: ['active-assessment-attempt', variables.providerId] });
        
        toast.success('Assessment started! Your configuration is now locked.');
      } else {
        toast.error(result.error || 'Failed to start assessment');
      }
    },
    onError: (error) => {
      console.error('Start assessment error:', error);
      toast.error('Failed to start assessment. Please try again.');
    },
  });
}

/**
 * Submit completed assessment
 */
export function useSubmitAssessment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (attemptId: string) => submitAssessment(attemptId),
    onSuccess: (result) => {
      if (result.success) {
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['current-provider'] });
        queryClient.invalidateQueries({ queryKey: ['active-assessment-attempt'] });
        queryClient.invalidateQueries({ queryKey: ['assessment-history'] });
        
        if (result.passed) {
          toast.success(`Congratulations! You passed with ${result.score}%`);
        } else {
          toast.info(`Assessment completed. Score: ${result.score}%`);
        }
      } else {
        toast.error(result.error || 'Failed to submit assessment');
      }
    },
    onError: (error) => {
      console.error('Submit assessment error:', error);
      toast.error('Failed to submit assessment. Please try again.');
    },
  });
}

/**
 * Calculate remaining time for active assessment
 */
export function useAssessmentTimeRemaining(attempt: AssessmentAttempt | null) {
  const getTimeRemaining = (): number => {
    if (!attempt) return 0;
    
    const startedAt = new Date(attempt.started_at);
    const expiresAt = new Date(startedAt.getTime() + attempt.time_limit_minutes * 60 * 1000);
    const now = new Date();
    
    const remainingMs = expiresAt.getTime() - now.getTime();
    return Math.max(0, Math.floor(remainingMs / 1000)); // seconds
  };

  return {
    secondsRemaining: getTimeRemaining(),
    isExpired: getTimeRemaining() <= 0,
    formatTime: () => {
      const seconds = getTimeRemaining();
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    },
  };
}
