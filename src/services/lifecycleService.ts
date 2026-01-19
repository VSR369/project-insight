/**
 * Lifecycle Service
 * 
 * Central service for lifecycle validation and governance rules.
 * Implements the lock milestones and cascade impact detection from BRD.
 */

// Re-export constants for backward compatibility
export {
  LOCK_THRESHOLDS,
  LIFECYCLE_RANKS,
  FIELD_CATEGORIES,
  STATUS_DISPLAY_NAMES,
  TERMINAL_STATES,
  HIDDEN_STATES,
  VIEW_ONLY_STATES,
  type FieldCategory,
} from '@/constants/lifecycle.constants';

import {
  LOCK_THRESHOLDS,
  LIFECYCLE_RANKS,
  STATUS_DISPLAY_NAMES,
  TERMINAL_STATES,
  HIDDEN_STATES,
  VIEW_ONLY_STATES,
  type FieldCategory,
} from '@/constants/lifecycle.constants';

/**
 * Check if a lifecycle status is a terminal state (no further progression)
 */
export function isTerminalState(status: string): boolean {
  return TERMINAL_STATES.includes(status as typeof TERMINAL_STATES[number]);
}

/**
 * Check if a lifecycle status is a hidden state (content should be hidden)
 * Applies to suspended and inactive statuses per Primary Action Matrix
 */
export function isHiddenState(status: string): boolean {
  return HIDDEN_STATES.includes(status as typeof HIDDEN_STATES[number]);
}

/**
 * Check if a lifecycle status is a view-only terminal state
 */
export function isViewOnlyState(status: string): boolean {
  return VIEW_ONLY_STATES.includes(status as typeof VIEW_ONLY_STATES[number]);
}

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

  // Content lock check - registration, mode, org, proof points (BR-3.1.2, BR-3.5.4)
  // Updated: Now locked at assessment start (rank 100) per multi-industry plan
  if (fieldCategory === 'content' || fieldCategory === 'registration') {
    if (lifecycleRank >= LOCK_THRESHOLDS.CONTENT) {
      return {
        allowed: false,
        reason: 'This section is locked after assessment starts. Please contact support if changes are needed.',
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
 * Step mapping (aligned with ENROLLMENT_STEPS in WizardLayout):
 * 1 = Registration, 2 = Mode, 3 = Org, 4 = Expertise, 5 = Proof Points, 
 * 6 = Assessment, 7 = Interview Slot, 8 = Panel, 9 = Certification
 * 
 * Each step locks at a different threshold based on lifecycle progression.
 * 
 * @param stepId - Wizard step ID (1-9)
 * @param lifecycleRank - Current lifecycle rank (from enrollment, NOT provider)
 * @returns boolean indicating if step is locked
 */
export function isWizardStepLocked(stepId: number, lifecycleRank: number): boolean {
  switch (stepId) {
    case 1: // Registration - locked at assessment start
    case 2: // Participation Mode - locked at assessment start
    case 3: // Organization - locked at assessment start
      return lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
    
    case 4: // Expertise Level - locked at assessment start
      return lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION;
    
    case 5: // Proof Points - locked at assessment start
      return lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
    
    case 6: // Assessment - locked after passing
      return lifecycleRank >= LIFECYCLE_RANKS.assessment_passed;
    
    case 7: // Interview Slot - locked after scheduling
      return lifecycleRank >= LIFECYCLE_RANKS.panel_scheduled;
    
    case 8: // Panel Discussion - locked after completion
      return lifecycleRank >= LIFECYCLE_RANKS.panel_completed;
    
    case 9: // Certification - locked at terminal states
      return lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING;
    
    default:
      return false;
  }
}

/**
 * Get human-readable status display name
 */
export function getStatusDisplayName(status: string): string {
  return STATUS_DISPLAY_NAMES[status] || status;
}
