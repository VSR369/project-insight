/**
 * Profile Strength Service
 * 
 * Pure functions for computing profile strength milestones (20→100%).
 * No side effects, no DB calls — just business logic.
 */

import { PROFILE_STRENGTH_MILESTONES, PROFILE_STRENGTH_LABELS } from '@/constants/enrollment.constants';

interface ProfileFields {
  /** Has first_name and last_name */
  hasName: boolean;
  /** Has bio_tagline */
  hasBio: boolean;
  /** Has phone */
  hasPhone: boolean;
  /** Has linkedin_url or portfolio_url */
  hasLinks: boolean;
  /** Has avatar_url */
  hasAvatar: boolean;
  /** Has availability set */
  hasAvailability: boolean;
  /** Has expertise_level_id set */
  hasExpertiseLevel: boolean;
  /** Has industry_segment_id set */
  hasIndustrySegment: boolean;
  /** Has at least one speciality */
  hasSpecialities: boolean;
  /** Has at least one solution type */
  hasSolutionTypes: boolean;
  /** Has at least one proof point */
  hasProofPoints: boolean;
  /** Has passed assessment */
  hasPassedAssessment: boolean;
}

interface ProfileStrengthResult {
  /** Current strength percentage (0-100) */
  strength: number;
  /** Current milestone label */
  milestoneLabel: string;
  /** Next milestone percentage (null if at 100) */
  nextMilestone: number | null;
  /** Next milestone label (null if at 100) */
  nextMilestoneLabel: string | null;
  /** Missing items to reach next milestone */
  missingItems: string[];
  /** Whether profile is complete enough for challenge matching */
  isMatchReady: boolean;
}

/**
 * Compute profile strength from field presence.
 * 
 * Milestones:
 * - 20%: Registration only (auto-granted)
 * - 60%: Basic profile (name + bio + phone + links/avatar)
 * - 70%: Expertise declared (expertise level + industry + specialities)
 * - 85%: Proof submitted (at least one proof point)
 * - 100%: Full profile (assessment passed + solution types)
 */
export function computeProfileStrength(fields: ProfileFields): ProfileStrengthResult {
  const missing: string[] = [];
  let strength: number = PROFILE_STRENGTH_MILESTONES.REGISTRATION; // Always start at 20

  // Basic profile checks (20 → 60)
  const basicComplete = fields.hasName && fields.hasBio && fields.hasPhone
    && (fields.hasLinks || fields.hasAvatar) && fields.hasAvailability;

  if (!fields.hasBio) missing.push('Add a bio tagline');
  if (!fields.hasPhone) missing.push('Add phone number');
  if (!fields.hasLinks && !fields.hasAvatar) missing.push('Add LinkedIn/portfolio URL or avatar');
  if (!fields.hasAvailability) missing.push('Set availability');

  if (basicComplete) {
    strength = PROFILE_STRENGTH_MILESTONES.BASIC_PROFILE;

    // Expertise checks (60 → 70)
    const expertiseComplete = fields.hasExpertiseLevel && fields.hasIndustrySegment && fields.hasSpecialities;
    if (!fields.hasExpertiseLevel) missing.push('Select expertise level');
    if (!fields.hasIndustrySegment) missing.push('Select industry segment');
    if (!fields.hasSpecialities) missing.push('Add specialities');

    if (expertiseComplete) {
      strength = PROFILE_STRENGTH_MILESTONES.EXPERTISE_DECLARED;

      // Proof checks (70 → 85)
      if (!fields.hasProofPoints) missing.push('Submit at least one proof point');

      if (fields.hasProofPoints) {
        strength = PROFILE_STRENGTH_MILESTONES.PROOF_SUBMITTED;

        // Full profile checks (85 → 100)
        if (!fields.hasPassedAssessment) missing.push('Pass the assessment');
        if (!fields.hasSolutionTypes) missing.push('Select solution types');

        if (fields.hasPassedAssessment && fields.hasSolutionTypes) {
          strength = PROFILE_STRENGTH_MILESTONES.FULL_PROFILE;
        }
      }
    }
  }

  const milestoneLabel = PROFILE_STRENGTH_LABELS[strength] || 'Getting Started';
  const milestoneValues = Object.values(PROFILE_STRENGTH_MILESTONES).sort((a, b) => a - b);
  const nextIdx = milestoneValues.findIndex((m) => m > strength);
  const nextMilestone = nextIdx >= 0 ? milestoneValues[nextIdx] : null;
  const nextMilestoneLabel = nextMilestone ? (PROFILE_STRENGTH_LABELS[nextMilestone] ?? null) : null;

  return {
    strength,
    milestoneLabel,
    nextMilestone,
    nextMilestoneLabel,
    missingItems: missing,
    isMatchReady: strength >= PROFILE_STRENGTH_MILESTONES.EXPERTISE_DECLARED,
  };
}

/**
 * Get motivational message based on profile strength.
 */
export function getStrengthMotivation(strength: number): string {
  if (strength >= 100) return 'Your profile is complete! You\'re visible to all challenge seekers.';
  if (strength >= 85) return 'Almost there! Complete your assessment to unlock full visibility.';
  if (strength >= 70) return 'Great progress! Add proof points to boost your credibility.';
  if (strength >= 60) return 'Good start! Declare your expertise to get matched with challenges.';
  return 'Complete your profile to start getting matched with challenges.';
}
