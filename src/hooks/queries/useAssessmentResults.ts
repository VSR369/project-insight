/**
 * Assessment Results Hook
 * 
 * Fetches assessment attempt data with full taxonomy joins
 * and builds hierarchical score breakdown
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { buildResultsHierarchy, type AssessmentResultsHierarchy } from '@/services/assessmentResultsService';

export interface AssessmentAttemptResult {
  id: string;
  enrollmentId: string | null;
  providerId: string;
  totalQuestions: number;
  answeredQuestions: number | null;
  scorePercentage: number | null;
  isPassed: boolean | null;
  timeLimitMinutes: number;
  startedAt: string;
  submittedAt: string | null;
}

export interface AssessmentResultsData {
  attempt: AssessmentAttemptResult;
  hierarchy: AssessmentResultsHierarchy;
  provider: {
    firstName: string;
    lastName: string;
  } | null;
  enrollment: {
    expertiseLevelName: string;
    industrySegmentName: string;
  } | null;
}

/**
 * Fetch assessment results with full hierarchy
 */
export function useAssessmentResults(attemptId: string | undefined) {
  return useQuery({
    queryKey: ['assessment-results', attemptId],
    queryFn: async (): Promise<AssessmentResultsData> => {
      if (!attemptId) {
        throw new Error('Attempt ID is required');
      }

      // Fetch attempt details
      const { data: attemptData, error: attemptError } = await supabase
        .from('assessment_attempts')
        .select(`
          id,
          enrollment_id,
          provider_id,
          total_questions,
          answered_questions,
          score_percentage,
          is_passed,
          time_limit_minutes,
          started_at,
          submitted_at
        `)
        .eq('id', attemptId)
        .single();

      if (attemptError) throw new Error(`Failed to fetch attempt: ${attemptError.message}`);
      if (!attemptData) throw new Error('Attempt not found');

      // Fetch responses with full taxonomy chain
      const { data: responsesData, error: responsesError } = await supabase
        .from('assessment_attempt_responses')
        .select(`
          id,
          question_id,
          selected_option,
          is_correct,
          question_bank!inner (
            id,
            question_text,
            correct_option,
            options,
            difficulty,
            expected_answer_guidance,
            speciality_id,
            specialities!inner (
              id,
              name,
              sub_domain_id,
              sub_domains!inner (
                id,
                name,
                proficiency_area_id,
                proficiency_areas!inner (
                  id,
                  name
                )
              )
            )
          )
        `)
        .eq('attempt_id', attemptId);

      if (responsesError) throw new Error(`Failed to fetch responses: ${responsesError.message}`);

      // Fetch provider info
      let providerInfo = null;
      if (attemptData.provider_id) {
        const { data: providerData } = await supabase
          .from('solution_providers')
          .select('first_name, last_name')
          .eq('id', attemptData.provider_id)
          .single();
        
        if (providerData) {
          providerInfo = {
            firstName: providerData.first_name || '',
            lastName: providerData.last_name || '',
          };
        }
      }

      // Fetch enrollment with expertise/industry info
      let enrollmentInfo = null;
      if (attemptData.enrollment_id) {
        const { data: enrollmentData } = await supabase
          .from('provider_industry_enrollments')
          .select(`
            expertise_levels (name),
            industry_segments (name)
          `)
          .eq('id', attemptData.enrollment_id)
          .single();
        
        if (enrollmentData) {
          enrollmentInfo = {
            expertiseLevelName: (enrollmentData.expertise_levels as any)?.name || '—',
            industrySegmentName: (enrollmentData.industry_segments as any)?.name || '—',
          };
        }
      }

      // Build hierarchy from responses
      const hierarchy = buildResultsHierarchy(responsesData as any || []);

      return {
        attempt: {
          id: attemptData.id,
          enrollmentId: attemptData.enrollment_id,
          providerId: attemptData.provider_id,
          totalQuestions: attemptData.total_questions,
          answeredQuestions: attemptData.answered_questions,
          scorePercentage: attemptData.score_percentage ? Number(attemptData.score_percentage) : null,
          isPassed: attemptData.is_passed,
          timeLimitMinutes: attemptData.time_limit_minutes,
          startedAt: attemptData.started_at,
          submittedAt: attemptData.submitted_at,
        },
        hierarchy,
        provider: providerInfo,
        enrollment: enrollmentInfo,
      };
    },
    enabled: !!attemptId,
  });
}
