/**
 * Lifecycle Constants
 * 
 * Centralized configuration for lifecycle management, lock thresholds,
 * and status ranks.
 */

/** Lock thresholds based on lifecycle rank */
export const LOCK_THRESHOLDS = {
  /** Configuration locked (Industry, Level, Specialities) - at assessment start */
  CONFIGURATION: 100,
  /** Content locked (Registration, Mode, Org, Proof Points) - at assessment start per plan */
  CONTENT: 100,
  /** Everything frozen - at verification/terminal states */
  EVERYTHING: 140,
} as const;

/** Lifecycle ranks for all stages */
export const LIFECYCLE_RANKS: Record<string, number> = {
  invited: 10,
  registered: 15,
  enrolled: 20,
  mode_selected: 30,
  org_info_pending: 35,
  org_validated: 40,
  expertise_selected: 50,
  profile_building: 55,
  proof_points_started: 60,
  proof_points_min_met: 70,
  assessment_pending: 90,
  assessment_in_progress: 100,
  assessment_completed: 105,
  assessment_passed: 110,
  panel_scheduled: 120,
  panel_completed: 130,
  verified: 140,
  active: 145,
  certified: 150,
  not_verified: 160,
  suspended: 200,
  inactive: 210,
} as const;

/** Field categories for lock checking */
export type FieldCategory = 'registration' | 'configuration' | 'content';

export const FIELD_CATEGORIES: Record<FieldCategory, string[]> = {
  registration: ['first_name', 'last_name', 'address', 'country_id', 'pin_code'],
  configuration: ['industry_segment_id', 'expertise_level_id', 'proficiency_areas', 'specialities'],
  content: ['proof_points'],
};

/** Human-readable status display names */
export const STATUS_DISPLAY_NAMES: Record<string, string> = {
  invited: 'Invited',
  registered: 'Registered',
  enrolled: 'Enrolled',
  mode_selected: 'Mode Selected',
  org_info_pending: 'Org Info Pending',
  org_validated: 'Org Validated',
  expertise_selected: 'Expertise Selected',
  profile_building: 'Profile Building',
  proof_points_started: 'Proof Points Started',
  proof_points_min_met: 'Proof Points Min Met',
  assessment_pending: 'Assessment Pending',
  assessment_in_progress: 'Assessment In Progress',
  assessment_completed: 'Assessment Completed',
  assessment_passed: 'Assessment Passed',
  panel_scheduled: 'Panel Scheduled',
  panel_completed: 'Panel Completed',
  verified: 'Verified',
  active: 'Active',
  certified: 'Certified',
  not_verified: 'Not Verified',
  suspended: 'Suspended',
  inactive: 'Inactive',
};
