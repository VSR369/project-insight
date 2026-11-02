/**
 * challengeVisibility — TypeScript mirror of BR-CHL-P10 (DEF-0035, carrying
 * DEF-0023 and DEF-0363). The database functions fn_provider_can_view_challenge
 * and provider_challenge_access are the enforcement authority; this module
 * mirrors the rule for UI messaging and unit tests.
 */

export type ChallengeVisibility = 'eligible_certified' | 'invite_only' | 'public';

export type ChallengeAccessReason =
  | 'privileged'
  | 'public'
  | 'invited'
  | 'certified'
  | 'not_invited'
  | 'not_certified'
  | 'no_provider_record'
  | 'not_found';

export interface ProviderEnrollmentLike {
  industrySegmentId: string | null;
  /** expertise_levels.level_number for the enrollment's expertise level */
  levelNumber: number;
  /** provider_industry_enrollments.lifecycle_status */
  lifecycleStatus: string;
}

export interface ChallengeAccessInput {
  visibility: ChallengeVisibility;
  /** challenges.industry_segment_id — null means "any industry" */
  challengeIndustrySegmentId: string | null;
  /** challenges.min_expertise_level (L1–L4) */
  minExpertiseLevel: number;
  enrollments: ProviderEnrollmentLike[];
  hasValidInvitation: boolean;
}

export interface ChallengeAccessResult {
  allowed: boolean;
  reason: ChallengeAccessReason;
}

/**
 * Only a 'certified' lifecycle status counts. Interview Unsuccessful,
 * Suspended, Revoked, Inactive and every other status count as NOT certified
 * (DEF-0023).
 */
export function isCertifiedEnrollment(enrollment: ProviderEnrollmentLike): boolean {
  return enrollment.lifecycleStatus === 'certified';
}

/** BR-CHL-P10: may this provider see and join this challenge? */
export function evaluateChallengeAccess(input: ChallengeAccessInput): ChallengeAccessResult {
  if (input.visibility === 'public') {
    return { allowed: true, reason: 'public' };
  }

  if (input.visibility === 'invite_only') {
    return input.hasValidInvitation
      ? { allowed: true, reason: 'invited' }
      : { allowed: false, reason: 'not_invited' };
  }

  // eligible_certified: Certified enrollment in the challenge's industry
  // segment at or above the minimum expertise level.
  const minLevel = input.minExpertiseLevel >= 1 ? input.minExpertiseLevel : 1;
  const match = input.enrollments.some(
    (e) =>
      isCertifiedEnrollment(e) &&
      (input.challengeIndustrySegmentId === null ||
        e.industrySegmentId === input.challengeIndustrySegmentId) &&
      e.levelNumber >= minLevel,
  );
  return match
    ? { allowed: true, reason: 'certified' }
    : { allowed: false, reason: 'not_certified' };
}

/** User-facing message for a denied access (DEF-0023 acceptance text). */
export function accessDeniedMessage(
  reason: ChallengeAccessReason,
  industryName: string | null,
): string {
  switch (reason) {
    case 'not_certified':
      return `You must be certified in ${industryName ?? 'this industry'} to join this challenge`;
    case 'not_invited':
      return 'This challenge is invite only. You need an invitation from the Curator to view it.';
    case 'no_provider_record':
      return 'Register as a Solution Provider to view this challenge.';
    default:
      return "This challenge doesn't exist, hasn't been published yet, or you don't have permission to view it.";
  }
}
