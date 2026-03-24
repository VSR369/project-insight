/**
 * useCogniPermissions — Centralized permission resolver for CogniBlend.
 * Translates raw role codes into semantic boolean capability flags.
 *
 * Two resolver layers:
 *   - `sees` (visibility): always checks ALL availableRoles — drives nav item rendering.
 *   - `can`  (action):     respects focused activeRole — drives dashboard sections & write actions.
 *
 * Two modes for action permissions:
 *   - Focused: when activeRole is set, only that role drives `can` flags.
 *   - Merged:  when no activeRole, all availableRoles are unioned.
 */

import { useCogniRoleContext } from '@/contexts/CogniRoleContext';

export function useCogniPermissions() {
  const { activeRole, availableRoles } = useCogniRoleContext();

  // Visibility: always all roles (nav items stay visible, dimmed by ROLE_NAV_RELEVANCE)
  const visibilityRoles = availableRoles;
  // Action: focused single role OR merged union
  const effectiveRoles = activeRole ? [activeRole] : availableRoles;

  const can  = (codes: string[]) => codes.some(c => effectiveRoles.includes(c));
  const sees = (codes: string[]) => codes.some(c => visibilityRoles.includes(c));

  return {
    // ── Nav visibility flags (always based on ALL user roles) ──
    canSeeChallengePage:  sees(['CA', 'CR']),
    canSeeRequests:       sees(['AM', 'RQ']),
    canSeeCurationQueue:  sees(['CU']),
    canSeeApprovalQueue:  sees(['ID']),
    canSeeLegalWorkspace: sees(['LC']),
    canSeeEvaluation:     sees(['ER']),
    canSeeEscrow:         sees(['FC']),

    // ── Action permissions (respects focused role) ──
    canCreateChallenge:   can(['CA', 'CR']),
    canSubmitRequest:     can(['AM', 'RQ']),
    canEditSpec:          can(['CA', 'CR']),
    canCurate:            can(['CU']),
    canApprove:           can(['ID']),
    canReviewEvaluation:  can(['ER']),
    canReviewLegal:       can(['LC']),
    canManageEscrow:      can(['FC']),

    // ── UX grouping flags (action-level) ──
    isSpecRole:           can(['CA', 'CR']),
    isBusinessOwner:      can(['AM', 'RQ']),

    // Context switcher trigger — only when roles have competing UX intent
    hasConflictingIntent: can(['AM', 'RQ']) && can(['CA', 'CR']),
  };
}

export type CogniPermissions = ReturnType<typeof useCogniPermissions>;
