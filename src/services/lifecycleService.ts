/**
 * Lifecycle Service
 * 
 * Central service for lifecycle validation and governance rules.
 * Implements the lock milestones and cascade impact detection from BRD.
 */

// Lock thresholds based on lifecycle rank
export const LOCK_THRESHOLDS = {
  /** Configuration locked (Industry, Level, Specialities) - at assessment start */
  CONFIGURATION: 100,
  /** Content locked (Registration, Proof Points) - at panel scheduled */
  CONTENT: 120,
  /** Everything frozen - at verification/terminal states */
  EVERYTHING: 140,
} as const;

// Lifecycle ranks for all stages
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

// Field categories for lock checking
export type FieldCategory = 'registration' | 'configuration' | 'content';

export const FIELD_CATEGORIES: Record<FieldCategory, string[]> = {
  registration: ['first_name', 'last_name', 'address', 'country_id', 'pin_code'],
  configuration: ['industry_segment_id', 'expertise_level_id', 'proficiency_areas', 'specialities'],
  content: ['proof_points'],
};

// Types for cascade impact
export type CascadeType = 'NONE' | 'HARD_RESET' | 'PARTIAL_RESET';
export type WarningLevel = 'none' | 'info' | 'warning' | 'critical';

export interface CascadeImpact {
  type: CascadeType;
  deletesProofPoints: boolean | 'specialty_only';
  deletesSpecialities: boolean;
  resetsToStatus: string | null;
  resetsToRank: number | null;
  warningLevel: WarningLevel;
  message?: string;
}

export interface LockCheckResult {
  allowed: boolean;
  reason?: string;
  lockLevel?: 'configuration' | 'content' | 'everything';
}

/**
 * Get lifecycle rank for a given status code
 */
export function getLifecycleRank(status: string): number {
  return LIFECYCLE_RANKS[status] ?? 0;
}

/**
 * Check if a field category can be modified based on lifecycle rank
 * 
 * @param lifecycleRank - Current lifecycle rank of the provider
 * @param fieldCategory - Category of fields being modified
 * @returns LockCheckResult with allowed status and reason if locked
 */
export function canModifyField(
  lifecycleRank: number,
  fieldCategory: FieldCategory
): LockCheckResult {
  // Terminal state check - everything frozen (BR-01)
  if (lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING) {
    return {
      allowed: false,
      reason: 'Your profile is frozen. No modifications are allowed after verification.',
      lockLevel: 'everything',
    };
  }

  // Content lock check - registration and proof points (BR-3.1.2, BR-3.5.4)
  if (fieldCategory === 'content' || fieldCategory === 'registration') {
    if (lifecycleRank >= LOCK_THRESHOLDS.CONTENT) {
      return {
        allowed: false,
        reason: 'This section is locked after panel scheduling. Please contact support if changes are needed.',
        lockLevel: 'content',
      };
    }
  }

  // Configuration lock check - industry, expertise, specialities (BR-3.2.3, BR-3.4.2)
  if (fieldCategory === 'configuration') {
    if (lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION) {
      return {
        allowed: false,
        reason: 'Industry and expertise settings cannot be changed during or after assessment.',
        lockLevel: 'configuration',
      };
    }
  }

  return { allowed: true };
}

/**
 * Determine cascade impact for field changes
 * 
 * @param fieldName - Name of the field being changed
 * @param currentRank - Current lifecycle rank
 * @param hasExpertiseSelected - Whether expertise level is selected
 * @param hasSpecialtyProofPoints - Whether specialty proof points exist
 * @returns CascadeImpact describing what will be affected
 */
export function getCascadeImpact(
  fieldName: string,
  currentRank: number,
  hasExpertiseSelected: boolean = false,
  hasSpecialtyProofPoints: boolean = false
): CascadeImpact {
  // Industry change (BR-3.2.2) - Hard reset if expertise exists
  if (fieldName === 'industry_segment_id' && hasExpertiseSelected) {
    return {
      type: 'HARD_RESET',
      deletesProofPoints: 'specialty_only', // Keep general, delete specialty
      deletesSpecialities: true,
      resetsToStatus: 'enrolled',
      resetsToRank: LIFECYCLE_RANKS.enrolled,
      warningLevel: 'critical',
      message: 'Changing your industry will delete all specialty proof points and reset your expertise selections.',
    };
  }

  // Expertise level change (BR-3.4.1) - Partial reset if specialty proof points exist
  if (fieldName === 'expertise_level_id' && hasSpecialtyProofPoints) {
    return {
      type: 'PARTIAL_RESET',
      deletesProofPoints: 'specialty_only',
      deletesSpecialities: true,
      resetsToStatus: 'expertise_selected',
      resetsToRank: LIFECYCLE_RANKS.expertise_selected,
      warningLevel: 'warning',
      message: 'Changing your expertise level will delete specialty-specific proof points and clear speciality selections.',
    };
  }

  // Expertise level change - No specialty proof points, just reset selections
  if (fieldName === 'expertise_level_id' && hasExpertiseSelected) {
    return {
      type: 'PARTIAL_RESET',
      deletesProofPoints: false,
      deletesSpecialities: true,
      resetsToStatus: 'expertise_selected',
      resetsToRank: LIFECYCLE_RANKS.expertise_selected,
      warningLevel: 'info',
      message: 'Changing your expertise level will clear your current speciality selections.',
    };
  }

  return {
    type: 'NONE',
    deletesProofPoints: false,
    deletesSpecialities: false,
    resetsToStatus: null,
    resetsToRank: null,
    warningLevel: 'none',
  };
}

/**
 * Check if step is locked based on lifecycle rank
 * 
 * @param stepId - Wizard step ID (1-9)
 * @param lifecycleRank - Current lifecycle rank
 * @returns boolean indicating if step is locked
 */
export function isWizardStepLocked(stepId: number, lifecycleRank: number): boolean {
  // Terminal state - all steps locked
  if (lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING) {
    return true;
  }

  switch (stepId) {
    case 1: // Registration
      return lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
    case 2: // Participation Mode
      return lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
    case 3: // Organization
      return lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
    case 4: // Expertise Level
      return lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION;
    case 5: // Proficiency
      return lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION;
    case 6: // Proof Points
      return lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
    case 7: // Assessment
      return lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING;
    case 8: // Panel
      return lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING;
    case 9: // Complete
      return lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING;
    default:
      return false;
  }
}

/**
 * Get human-readable status display name
 */
export function getStatusDisplayName(status: string): string {
  const displayNames: Record<string, string> = {
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
  return displayNames[status] || status;
}
