/**
 * Enrollment Constants
 * 
 * Profile strength milestones, availability options, and enrollment configuration.
 */

/** Profile strength milestone thresholds (percentage) */
export const PROFILE_STRENGTH_MILESTONES = {
  REGISTRATION: 20,
  BASIC_PROFILE: 60,
  EXPERTISE_DECLARED: 70,
  PROOF_SUBMITTED: 85,
  FULL_PROFILE: 100,
} as const;

/** Milestone labels for UI display */
export const PROFILE_STRENGTH_LABELS: Record<number, string> = {
  20: 'Getting Started',
  60: 'Basic Profile',
  70: 'Expertise Declared',
  85: 'Proof Submitted',
  100: 'Full Profile',
};

/** Provider availability options */
export const AVAILABILITY_OPTIONS = [
  { value: 'full_time', label: 'Full Time', description: 'Available for full-time engagements' },
  { value: 'part_time', label: 'Part Time', description: 'Available for part-time work' },
  { value: 'weekends', label: 'Weekends Only', description: 'Available on weekends' },
  { value: 'project_based', label: 'Project Based', description: 'Available for specific projects' },
  { value: 'not_available', label: 'Not Available', description: 'Currently not taking work' },
] as const;

export type AvailabilityCode = typeof AVAILABILITY_OPTIONS[number]['value'];

/** Challenge access types */
export const CHALLENGE_ACCESS_TYPES = [
  { value: 'open_all', label: 'Open to All', description: 'Any registered provider can participate' },
  { value: 'certified_only', label: 'Certified Only', description: 'Requires any certification tier' },
  { value: 'star_gated', label: 'Star Gated', description: 'Requires minimum star tier' },
  { value: 'invite_only', label: 'Invite Only', description: 'Only invited providers can participate' },
] as const;

export type ChallengeAccessType = typeof CHALLENGE_ACCESS_TYPES[number]['value'];

/** Submission types */
export const SUBMISSION_TYPES = [
  { value: 'abstract', label: 'Abstract' },
  { value: 'full', label: 'Full Submission' },
  { value: 'prototype', label: 'Prototype' },
  { value: 'presentation', label: 'Presentation' },
] as const;

/** Certification paths */
export const CERTIFICATION_PATHS = [
  { value: 'experience', label: 'Experience Track', description: 'Complete enrollment wizard + assessment + interview' },
  { value: 'performance', label: 'Performance Track', description: 'Earn certification through consistent high performance' },
  { value: 'vip', label: 'VIP Track', description: 'Invited industry experts with pre-certified status' },
] as const;

export type CertificationPath = typeof CERTIFICATION_PATHS[number]['value'];

/** Spec-aligned performance score dimensions */
export const PERFORMANCE_DIMENSIONS = [
  'community_engagement',
  'abstracts_submitted',
  'solution_quality',
  'complexity_handled',
  'win_achievement',
  'knowledge_contrib',
] as const;

export type PerformanceDimension = typeof PERFORMANCE_DIMENSIONS[number];

/** Performance dimension display labels */
export const PERFORMANCE_DIMENSION_LABELS: Record<PerformanceDimension, string> = {
  community_engagement: 'Community Engagement',
  abstracts_submitted: 'Abstracts Submitted',
  solution_quality: 'Solution Quality',
  complexity_handled: 'Complexity Handled',
  win_achievement: 'Win Achievement',
  knowledge_contrib: 'Knowledge Contribution',
};

/** Default weights per spec */
export const PERFORMANCE_DEFAULT_WEIGHTS: Record<PerformanceDimension, number> = {
  community_engagement: 0.10,
  abstracts_submitted: 0.15,
  solution_quality: 0.25,
  complexity_handled: 0.20,
  win_achievement: 0.20,
  knowledge_contrib: 0.10,
};

/** Auto-certification thresholds for performance track */
export const PERFORMANCE_CERT_THRESHOLDS = {
  PROVEN: 51,
  ACCLAIMED: 66,
  EMINENT: 86,
} as const;
