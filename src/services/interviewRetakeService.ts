/**
 * Interview Retake Service
 * 
 * Handles re-interview eligibility checks and expertise change re-flow
 * for the Post-Interview Failure policy.
 */

import { supabase } from '@/integrations/supabase/client';
import { 
  getCoolingOffDays, 
  getDaysUntilEligible,
  canScheduleReinterview,
  INTERVIEW_RETAKE_POLICY 
} from '@/constants/interview-retake.constants';
import { LIFECYCLE_RANKS, REATTEMPT_ELIGIBLE_STATES } from '@/constants/lifecycle.constants';

export interface ReinterviewEligibility {
  /** Whether the provider is eligible to schedule a re-interview now */
  isEligible: boolean;
  /** Days remaining until eligibility (0 if already eligible) */
  daysRemaining: number;
  /** Date when re-attempt becomes available */
  eligibleAfter: Date | null;
  /** Number of interview attempts made */
  attemptCount: number;
  /** Whether the provider can modify their expertise (Path B) */
  canModifyExpertise: boolean;
  /** Whether the provider is in interview_unsuccessful status */
  isInterviewUnsuccessful: boolean;
}

/**
 * Check re-interview eligibility for an enrollment
 * 
 * @param enrollmentId - The enrollment to check
 * @returns ReinterviewEligibility object with all eligibility details
 */
export async function checkReinterviewEligibility(
  enrollmentId: string
): Promise<ReinterviewEligibility> {
  const { data, error } = await supabase
    .from('provider_industry_enrollments')
    .select('lifecycle_status, interview_attempt_count, reattempt_eligible_after')
    .eq('id', enrollmentId)
    .single();
    
  if (error || !data) {
    throw new Error('Failed to check re-interview eligibility');
  }
  
  const isInterviewUnsuccessful = data.lifecycle_status === 'interview_unsuccessful';
  const eligibleAfter = data.reattempt_eligible_after 
    ? new Date(data.reattempt_eligible_after) 
    : null;
  
  const daysRemaining = getDaysUntilEligible(eligibleAfter);
  const isEligible = isInterviewUnsuccessful && 
                     eligibleAfter !== null && 
                     canScheduleReinterview(eligibleAfter);
  
  return {
    isEligible,
    daysRemaining,
    eligibleAfter,
    attemptCount: data.interview_attempt_count || 0,
    canModifyExpertise: isInterviewUnsuccessful,
    isInterviewUnsuccessful,
  };
}

/**
 * Reset enrollment for expertise change re-flow (Path B)
 * Called when provider modifies expertise after interview failure.
 * Uses the database RPC for atomicity.
 * 
 * @param enrollmentId - The enrollment to reset
 * @returns Success result
 */
export async function resetForExpertiseChange(enrollmentId: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  // Get current user for audit
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'User not authenticated' };
  }

  const { data, error } = await supabase.rpc('reset_enrollment_for_expertise_change', {
    p_enrollment_id: enrollmentId,
    p_user_id: user.id,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // RPC returns JSON with success/error
  const result = data as { success: boolean; message?: string; error?: string };
  return result;
}

/**
 * Check if the provider can re-attempt the interview
 * (i.e., status is interview_unsuccessful)
 */
export function canReattemptInterview(status: string): boolean {
  return REATTEMPT_ELIGIBLE_STATES.includes(status as typeof REATTEMPT_ELIGIBLE_STATES[number]);
}

/**
 * Check if expertise can be modified after interview failure
 * Industry segment is NEVER changeable
 */
export function canModifyExpertiseAfterFailure(
  status: string,
  fieldName: string
): { allowed: boolean; reason?: string } {
  // Must be in interview_unsuccessful status
  if (status !== 'interview_unsuccessful') {
    return { 
      allowed: false, 
      reason: 'Expertise changes are only allowed after interview failure.' 
    };
  }
  
  // Industry segment NEVER changeable
  if (fieldName === 'industry_segment_id') {
    return { 
      allowed: false, 
      reason: 'Industry segment cannot be changed. Please create a new enrollment for a different industry.' 
    };
  }
  
  return { allowed: true };
}

/**
 * Get cascade impact description for expertise change after interview failure
 */
export function getExpertiseChangeReflowImpact() {
  return {
    type: 'HARD_RESET' as const,
    deletesProofPoints: true,
    deletesSpecialities: true,
    resetsToStatus: INTERVIEW_RETAKE_POLICY.EXPERTISE_CHANGE_RESET_TO,
    resetsToRank: INTERVIEW_RETAKE_POLICY.EXPERTISE_CHANGE_RESET_RANK,
    warningLevel: 'critical' as const,
    message: 'Changing your expertise will clear all proof points and assessment. You will need to re-submit proof points and re-take the assessment before scheduling a new interview.',
  };
}

/**
 * Format the eligibility date for display
 */
export function formatEligibilityDate(eligibleAfter: Date | string | null): string {
  if (!eligibleAfter) return 'N/A';
  const date = typeof eligibleAfter === 'string' ? new Date(eligibleAfter) : eligibleAfter;
  return date.toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
}
