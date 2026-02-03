/**
 * Finalize Certification Hook
 * 
 * Calculates composite score and finalizes certification for an enrollment.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { handleMutationError } from '@/lib/errorHandler';
import {
  SCORE_WEIGHTS,
  calculateCompositeScore,
} from '@/constants/certification.constants';

interface FinalizeCertificationParams {
  enrollmentId: string;
}

interface FinalizeCertificationResult {
  success: boolean;
  certification_level: string | null;
  star_rating: number | null;
  lifecycle_status: string;
  interview_attempt_count?: number;
  reattempt_eligible_after?: string;
  cooling_off_days?: number;
}

/**
 * Hook to finalize certification for an enrollment
 * 
 * This hook:
 * 1. Fetches proof points, assessment, and interview scores
 * 2. Calculates the weighted composite score
 * 3. Calls the finalize_certification RPC to update the enrollment
 */
export function useFinalizeCertification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enrollmentId }: FinalizeCertificationParams): Promise<FinalizeCertificationResult> => {
      // 1. Fetch proof points score from enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('provider_industry_enrollments')
        .select('proof_points_final_score, lifecycle_status, lifecycle_rank')
        .eq('id', enrollmentId)
        .single();

      if (enrollmentError) throw new Error(`Failed to fetch enrollment: ${enrollmentError.message}`);

      // Validate enrollment is at correct lifecycle stage
      if (enrollment.lifecycle_rank < 130) {
        throw new Error('Interview must be completed before certification can be finalized');
      }

      // 2. Fetch latest assessment score
      const { data: assessment, error: assessmentError } = await supabase
        .from('assessment_attempts')
        .select('score_percentage')
        .eq('enrollment_id', enrollmentId)
        .eq('is_passed', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (assessmentError) throw new Error(`Failed to fetch assessment: ${assessmentError.message}`);

      // 3. Fetch interview score
      const { data: interview, error: interviewError } = await supabase
        .from('interview_bookings')
        .select('interview_score_out_of_10')
        .eq('enrollment_id', enrollmentId)
        .not('interview_submitted_at', 'is', null)
        .single();

      if (interviewError) throw new Error(`Failed to fetch interview: ${interviewError.message}`);

      // 4. Calculate composite score using the standard formula
      const proofPointsScore = enrollment.proof_points_final_score ?? 0;
      const assessmentPercentage = assessment.score_percentage ?? 0;
      const interviewScore = interview.interview_score_out_of_10 ?? 0;

      const { score: compositeScore, isComplete } = calculateCompositeScore(
        proofPointsScore,
        assessmentPercentage,
        interviewScore
      );

      if (!isComplete || compositeScore === null) {
        throw new Error('Cannot finalize certification: missing required scores');
      }

      // 5. Get current user for audit
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // 6. Call RPC to finalize certification
      const { data, error } = await supabase.rpc('finalize_certification', {
        p_enrollment_id: enrollmentId,
        p_composite_score: compositeScore,
        p_certifying_user_id: user.id,
      });

      if (error) throw new Error(`Failed to finalize certification: ${error.message}`);

      return data as unknown as FinalizeCertificationResult;
    },
    onSuccess: (result, { enrollmentId }) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['enrollment', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['provider-enrollments'] });
      queryClient.invalidateQueries({ queryKey: ['final-result-data', enrollmentId] });
      queryClient.invalidateQueries({ queryKey: ['candidate-details'] });

      if (result.lifecycle_status === 'certified') {
        toast.success(`Certification finalized: ${result.star_rating} star${result.star_rating !== 1 ? 's' : ''} (${result.certification_level})`);
      } else if (result.lifecycle_status === 'interview_unsuccessful') {
        toast.info(`Interview unsuccessful. Cooling-off period: ${result.cooling_off_days || 30} days.`);
      } else {
        toast.info('Certification finalized');
      }
    },
    onError: (error: Error) => {
      handleMutationError(error, { operation: 'finalize_certification' });
    },
  });
}
