/**
 * Dashboard helper functions and constants.
 */

import { Star, XCircle } from 'lucide-react';

/** Terminal lifecycle statuses where profile is complete/locked */
export const TERMINAL_STATUSES = ['certified', 'not_certified'];

/** Lifecycle rank thresholds for progress calculation */
export const LIFECYCLE_PROGRESS_MAP: Record<string, number> = {
  'invited': 0,
  'registered': 10,
  'enrolled': 15,
  'mode_selected': 25,
  'org_info_pending': 30,
  'org_validated': 40,
  'expertise_selected': 50,
  'proof_points_started': 60,
  'proof_points_min_met': 70,
  'assessment_pending': 75,
  'assessment_in_progress': 80,
  'assessment_passed': 85,
  'assessment_completed': 90,
  'panel_scheduled': 92,
  'panel_completed': 95,
  'verified': 100,
  'certified': 100,
  'not_verified': 100,
};

/** Get next action text based on lifecycle status */
export const getNextAction = (status: string): string | null => {
  switch (status) {
    case 'registered':
    case 'enrolled':
      return 'Select participation mode';
    case 'mode_selected':
      return 'Complete organization details';
    case 'org_info_pending':
      return 'Awaiting manager approval';
    case 'org_validated':
      return 'Select expertise level';
    case 'expertise_selected':
      return 'Add proof points';
    case 'proof_points_started':
      return 'Add more proof points (min 5)';
    case 'proof_points_min_met':
      return 'Start assessment';
    case 'assessment_pending':
      return 'Complete assessment';
    case 'assessment_in_progress':
      return 'Continue assessment';
    case 'assessment_passed':
      return 'Schedule panel interview';
    case 'panel_scheduled':
      return 'Prepare for panel interview';
    case 'panel_completed':
      return 'View certification status';
    case 'certified':
      return null;
    case 'not_certified':
      return 'Review certification status';
    default:
      return 'Continue setup';
  }
};

/** Calculate progress for an enrollment */
export const getEnrollmentProgress = (status: string): number => {
  return LIFECYCLE_PROGRESS_MAP[status] || 0;
};

/** Get badge variant for lifecycle status */
export const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
  switch (status) {
    case 'certified':
    case 'active':
      return 'default';
    case 'not_certified':
    case 'suspended':
    case 'inactive':
      return 'destructive';
    default:
      return 'secondary';
  }
};

/** Get status icon */
export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'certified':
      return <Star className="h-4 w-4" />;
    case 'not_certified':
      return <XCircle className="h-4 w-4" />;
    default:
      return null;
  }
};
