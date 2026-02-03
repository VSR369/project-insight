/**
 * Interview Retake Policy Constants
 * 
 * Defines cooling-off periods, field change rules, and re-attempt eligibility
 * for the Post-Interview Failure policy.
 */

export const INTERVIEW_RETAKE_POLICY = {
  /** Cooling-off periods by attempt number (in days) */
  COOLING_OFF_PERIODS: {
    FIRST_FAILURE: 30,
    SECOND_FAILURE: 60,
    THIRD_PLUS_FAILURE: 90,
  },
  
  /** NO maximum limit - unlimited attempts */
  MAX_INTERVIEW_ATTEMPTS: null, // Explicit null = unlimited
  
  /** What can be changed after interview failure */
  CHANGEABLE_FIELDS: {
    industry_segment_id: false,    // NEVER changeable
    expertise_level_id: true,      // Can change → triggers re-flow
    proficiency_areas: true,       // Can change → triggers re-flow
    specialities: true,            // Can change → triggers re-flow
  },
  
  /** Status reset target when expertise is modified */
  EXPERTISE_CHANGE_RESET_TO: 'expertise_selected' as const,
  EXPERTISE_CHANGE_RESET_RANK: 50,
} as const;

export type CoolingOffPeriod = typeof INTERVIEW_RETAKE_POLICY.COOLING_OFF_PERIODS;

/**
 * Calculate cooling-off days based on attempt number
 * 
 * @param attemptCount - Number of interview attempts (1 = first attempt)
 * @returns Number of days in cooling-off period
 */
export function getCoolingOffDays(attemptCount: number): number {
  const { COOLING_OFF_PERIODS } = INTERVIEW_RETAKE_POLICY;
  
  if (attemptCount === 1) return COOLING_OFF_PERIODS.FIRST_FAILURE;
  if (attemptCount === 2) return COOLING_OFF_PERIODS.SECOND_FAILURE;
  return COOLING_OFF_PERIODS.THIRD_PLUS_FAILURE; // 3rd and all subsequent
}

/**
 * Check if provider can schedule re-interview (cooling-off elapsed)
 * 
 * @param reattemptEligibleAfter - Date when re-attempt becomes available
 * @param currentDate - Current date (defaults to now)
 * @returns true if cooling-off period has elapsed
 */
export function canScheduleReinterview(
  reattemptEligibleAfter: Date | string | null,
  currentDate: Date = new Date()
): boolean {
  if (!reattemptEligibleAfter) return false;
  const eligibleDate = typeof reattemptEligibleAfter === 'string' 
    ? new Date(reattemptEligibleAfter) 
    : reattemptEligibleAfter;
  return currentDate >= eligibleDate;
}

/**
 * Calculate remaining days until re-interview eligibility
 * 
 * @param reattemptEligibleAfter - Date when re-attempt becomes available
 * @param currentDate - Current date (defaults to now)
 * @returns Number of days remaining (0 if already eligible)
 */
export function getDaysUntilEligible(
  reattemptEligibleAfter: Date | string | null,
  currentDate: Date = new Date()
): number {
  if (!reattemptEligibleAfter) return 0;
  const eligibleDate = typeof reattemptEligibleAfter === 'string' 
    ? new Date(reattemptEligibleAfter) 
    : reattemptEligibleAfter;
  
  const diff = eligibleDate.getTime() - currentDate.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a field can be changed after interview failure
 * 
 * @param fieldName - Name of the field to check
 * @returns true if field can be modified
 */
export function isFieldChangeableAfterFailure(fieldName: string): boolean {
  return INTERVIEW_RETAKE_POLICY.CHANGEABLE_FIELDS[
    fieldName as keyof typeof INTERVIEW_RETAKE_POLICY.CHANGEABLE_FIELDS
  ] ?? false;
}
