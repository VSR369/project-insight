/**
 * Assessment Questions Hook
 * 
 * React Query hook for generating and managing assessment questions
 * with balanced random selection.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  generateBalancedQuestions,
  logQuestionExposure,
  type GenerationInput,
  type GenerationResult,
  type QuestionWithMetadata,
} from '@/services/questionGenerationService';

/**
 * Hook to generate balanced assessment questions
 */
export function useGenerateAssessmentQuestions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: GenerationInput): Promise<GenerationResult> => {
      return await generateBalancedQuestions(input);
    },
    onSuccess: (result, input) => {
      if (result.success) {
        // Cache the generated questions
        queryClient.setQueryData(
          ['assessment-questions', input.enrollmentId],
          result.questions
        );
        
        if (result.warnings.length > 0) {
          console.warn('Assessment generation warnings:', result.warnings);
        }
      } else {
        toast.error('Failed to generate assessment questions');
      }
    },
    onError: (error: Error) => {
      toast.error(`Question generation failed: ${error.message}`);
    },
  });
}

/**
 * Hook to get cached assessment questions for an enrollment
 */
export function useAssessmentQuestions(enrollmentId?: string) {
  return useQuery({
    queryKey: ['assessment-questions', enrollmentId],
    queryFn: async (): Promise<QuestionWithMetadata[]> => {
      // Questions must be generated first via useGenerateAssessmentQuestions
      return [];
    },
    enabled: false, // Never auto-fetch - only populated via mutation
  });
}

/**
 * Hook to log question exposure after assessment completion
 */
export function useLogQuestionExposure() {
  return useMutation({
    mutationFn: async (params: {
      providerId: string;
      attemptId: string;
      questionIds: string[];
    }) => {
      await logQuestionExposure(
        params.providerId,
        params.attemptId,
        params.questionIds
      );
    },
    onError: (error: Error) => {
      console.error('Failed to log question exposure:', error);
    },
  });
}

/**
 * Hook to get question exposure history for a provider
 */
export function useQuestionExposureHistory(providerId?: string) {
  return useQuery({
    queryKey: ['question-exposure-history', providerId],
    queryFn: async () => {
      if (!providerId) return [];

      const { data, error } = await (await import('@/integrations/supabase/client')).supabase
        .from('question_exposure_log')
        .select('question_id, exposure_mode, exposed_at, attempt_id')
        .eq('provider_id', providerId)
        .order('exposed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!providerId,
  });
}

// Re-export types
export type { GenerationInput, GenerationResult, QuestionWithMetadata };
