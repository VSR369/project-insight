/**
 * Wizard Navigation Service
 * 
 * Centralized navigation logic for the enrollment wizard.
 * Provides consistent navigation behavior across all enrollment pages.
 */

import { LOCK_THRESHOLDS } from './lifecycleService';

// Step routes mapping (must match App.tsx routes)
export const STEP_ROUTES: Record<number, string> = {
  1: '/enroll/registration',
  2: '/enroll/participation-mode',
  3: '/enroll/organization',
  4: '/enroll/expertise',
  5: '/enroll/proof-points',
  6: '/enroll/assessment',
  7: '/enroll/interview-slot',
  8: '/enroll/panel-discussion',
  9: '/enroll/certification',
};

// Reverse mapping: route to step ID
export const ROUTE_TO_STEP: Record<string, number> = Object.entries(STEP_ROUTES).reduce(
  (acc, [stepId, route]) => {
    acc[route] = parseInt(stepId, 10);
    return acc;
  },
  {} as Record<string, number>
);

// Step titles for display
export const STEP_TITLES: Record<number, string> = {
  1: 'Registration',
  2: 'Participation Mode',
  3: 'Organization Details',
  4: 'Expertise Level',
  5: 'Proof Points',
  6: 'Assessment',
  7: 'Interview Slot',
  8: 'Panel Discussion',
  9: 'Certification',
};

/**
 * Navigation mode types
 */
export type NavigationMode = 'edit' | 'view' | 'blocked';

/**
 * Get the next step in the wizard
 * @param currentStep Current step ID
 * @param visibleSteps Array of visible step IDs (some steps may be hidden)
 * @returns Next step ID or null if at the end
 */
export function getNextStep(currentStep: number, visibleSteps: number[]): number | null {
  const currentIndex = visibleSteps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex >= visibleSteps.length - 1) {
    return null;
  }
  return visibleSteps[currentIndex + 1];
}

/**
 * Get the previous step in the wizard
 * @param currentStep Current step ID
 * @param visibleSteps Array of visible step IDs
 * @returns Previous step ID or null if at the beginning
 */
export function getPreviousStep(currentStep: number, visibleSteps: number[]): number | null {
  const currentIndex = visibleSteps.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return visibleSteps[currentIndex - 1];
}

/**
 * Determine which step corresponds to a lifecycle status
 * @param lifecycleStatus Current lifecycle status
 * @returns Corresponding step ID
 */
export function getStepForStatus(lifecycleStatus: string): number {
  const statusToStep: Record<string, number> = {
    'invited': 1,
    'registered': 1,
    'enrolled': 2,
    'mode_selected': 3,
    'org_info_pending': 3,
    'org_validated': 4,
    'expertise_selected': 5,
    'proof_points_started': 5,
    'proof_points_min_met': 6,
    'assessment_pending': 6,
    'assessment_in_progress': 6,
    'assessment_completed': 6,
    'assessment_passed': 7,
    'panel_scheduled': 8,
    'panel_completed': 9,
    'verified': 9,
    'certified': 9,
    'not_verified': 9,
  };
  return statusToStep[lifecycleStatus] || 1;
}

/**
 * Determine if navigation to a step is allowed and in what mode
 * @param stepId Target step ID
 * @param lifecycleRank Current lifecycle rank
 * @param completedSteps Array of completed step IDs
 * @returns Navigation capability with mode
 */
export function canNavigateToStep(
  stepId: number,
  lifecycleRank: number,
  completedSteps: number[]
): { canNavigate: boolean; mode: NavigationMode } {
  // Steps 1-4 are locked at CONFIGURATION threshold
  // Step 5 (proof points) is locked at CONTENT threshold
  // Step 6+ follow progression rules
  const isConfigStep = stepId <= 4;
  const isContentStep = stepId === 5;
  
  const isConfigLocked = lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION;
  const isContentLocked = lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
  const isEverythingLocked = lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING;
  
  // Determine if step is locked
  const isLocked = isEverythingLocked || 
    (isConfigStep && isConfigLocked) || 
    (isContentStep && isContentLocked);
  
  // Completed steps can be viewed even if locked
  const isCompleted = completedSteps.includes(stepId);
  
  if (isLocked && isCompleted) {
    // Locked but completed = view mode
    return { canNavigate: true, mode: 'view' };
  } else if (isLocked && !isCompleted) {
    // Locked and not completed = blocked
    return { canNavigate: false, mode: 'blocked' };
  } else {
    // Not locked = edit mode
    return { canNavigate: true, mode: 'edit' };
  }
}

/**
 * Get the route for a step
 * @param stepId Step ID
 * @returns Route path or null if invalid
 */
export function getStepRoute(stepId: number): string | null {
  return STEP_ROUTES[stepId] || null;
}

/**
 * Get step ID from current route
 * @param pathname Current pathname
 * @returns Step ID or null if not a wizard route
 */
export function getStepFromRoute(pathname: string): number | null {
  // Handle exact matches
  if (ROUTE_TO_STEP[pathname]) {
    return ROUTE_TO_STEP[pathname];
  }
  
  // Handle nested routes (e.g., /enroll/assessment/take -> step 6)
  const baseRoutes = Object.entries(ROUTE_TO_STEP);
  for (const [route, stepId] of baseRoutes) {
    if (pathname.startsWith(route)) {
      return stepId;
    }
  }
  
  return null;
}

/**
 * Determine if a step is in view-only mode based on lifecycle
 * @param stepId Step ID to check
 * @param lifecycleRank Current lifecycle rank
 * @returns True if step should be view-only
 */
export function isStepViewOnly(stepId: number, lifecycleRank: number): boolean {
  const isConfigStep = stepId <= 4;
  const isContentStep = stepId === 5;
  
  const isConfigLocked = lifecycleRank >= LOCK_THRESHOLDS.CONFIGURATION;
  const isContentLocked = lifecycleRank >= LOCK_THRESHOLDS.CONTENT;
  const isEverythingLocked = lifecycleRank >= LOCK_THRESHOLDS.EVERYTHING;
  
  return isEverythingLocked || 
    (isConfigStep && isConfigLocked) || 
    (isContentStep && isContentLocked);
}

/**
 * Get default navigation actions for a step
 * @param currentStep Current step ID
 * @param visibleSteps Array of visible step IDs
 * @param lifecycleRank Current lifecycle rank
 * @returns Object with back/continue routes and labels
 */
export function getDefaultNavigation(
  currentStep: number,
  visibleSteps: number[],
  lifecycleRank: number
): {
  backRoute: string | null;
  continueRoute: string | null;
  backLabel: string;
  continueLabel: string;
  isViewMode: boolean;
} {
  const prevStep = getPreviousStep(currentStep, visibleSteps);
  const nextStep = getNextStep(currentStep, visibleSteps);
  const isViewMode = isStepViewOnly(currentStep, lifecycleRank);
  
  return {
    backRoute: prevStep ? (getStepRoute(prevStep) || '/dashboard') : '/dashboard',
    continueRoute: nextStep ? getStepRoute(nextStep) : null,
    backLabel: prevStep ? 'Back' : 'Dashboard',
    continueLabel: isViewMode ? 'View Next' : 'Continue',
    isViewMode,
  };
}
