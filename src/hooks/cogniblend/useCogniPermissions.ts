/**
 * useCogniPermissions — Centralized permission resolver for CogniBlend.
 * Translates raw role codes into semantic boolean capability flags.
 *
 * Two modes:
 *   - Focused: when activeRole is set, only that role drives permissions.
 *   - Merged:  when no activeRole, all availableRoles are unioned.
 */

import { useCogniRoleContext } from '@/contexts/CogniRoleContext';

export function useCogniPermissions() {
  const { activeRole, availableRoles } = useCogniRoleContext();

  // Focused mode: single role. Merged mode: all roles.
  const effectiveRoles = activeRole ? [activeRole] : availableRoles;
  const has = (codes: string[]) => codes.some(c => effectiveRoles.includes(c));

  return {
    // Challenge lifecycle capabilities
    canCreateChallenge:   has(['CA', 'CR']),
    canSubmitRequest:     has(['AM', 'RQ']),
    canEditSpec:          has(['CA', 'CR']),
    canCurate:            has(['CU']),
    canApprove:           has(['ID']),
    canReviewEvaluation:  has(['ER']),
    canReviewLegal:       has(['LC']),
    canManageEscrow:      has(['FC']),

    // UX grouping flags
    isSpecRole:           has(['CA', 'CR']),
    isBusinessOwner:      has(['AM', 'RQ']),

    // Context switcher trigger — only when roles have competing UX intent
    hasConflictingIntent: has(['AM', 'RQ']) && has(['CA', 'CR']),
  };
}

export type CogniPermissions = ReturnType<typeof useCogniPermissions>;
