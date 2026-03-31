/**
 * useCogniPermissions — Centralized permission resolver for CogniBlend.
 * Translates raw role codes into semantic boolean capability flags.
 *
 * ROLE ARCHITECTURE v2: 2 core roles (CR, CU) + 3 support (ER, LC, FC)
 * Removed: AM, RQ, CA, ID — all legacy references resolved to CR or CU.
 *
 * Two resolver layers:
 *   - `sees` (visibility): always checks ALL availableRoles — drives nav item rendering.
 *   - `can`  (action):     respects focused activeRole — drives dashboard sections & write actions.
 */

import { useCogniRoleContext } from '@/contexts/CogniRoleContext';

/** Seeking-org role codes — users with ONLY these have no solver features */
const SEEKING_ORG_ROLES = new Set(['CR', 'CU', 'ER', 'LC', 'FC', 'CA']);

export function useCogniPermissions() {
  const { activeRole, availableRoles } = useCogniRoleContext();

  // Visibility: always all roles (nav items stay visible, dimmed by ROLE_NAV_RELEVANCE)
  const visibilityRoles = availableRoles;
  // Action: focused single role OR merged union
  const effectiveRoles = activeRole ? [activeRole] : availableRoles;

  const can  = (codes: string[]) => codes.some(c => effectiveRoles.includes(c));
  const sees = (codes: string[]) => codes.some(c => visibilityRoles.includes(c));

  // True when user holds at least one role outside the seeking-org set
  const canSeeSolverFeatures = availableRoles.length > 0 &&
    !availableRoles.every(r => SEEKING_ORG_ROLES.has(r));

  return {
    // ── Nav visibility flags (always based on ALL user roles) ──
    canSeeChallengePage:  sees(['CR']),
    canSeeCreatorDashboard: sees(['CR']),
    canSeeCurationQueue:  sees(['CU']),
    canSeeLegalWorkspace: sees(['LC']),
    canSeeEvaluation:     sees(['ER']),
    canSeeEscrow:         sees(['FC']),
    canSeeSolverFeatures,

    // ── Action permissions (respects focused role) ──
    canCreateChallenge:   can(['CR']),
    canEditSpec:          can(['CR']),
    canCurate:            can(['CU']),
    canReviewEvaluation:  can(['ER']),
    canReviewLegal:       can(['LC']),
    canManageEscrow:      can(['FC']),

    // ── UX grouping flags (action-level) ──
    isSpecRole:           can(['CR']),
  };
}

export type CogniPermissions = ReturnType<typeof useCogniPermissions>;
