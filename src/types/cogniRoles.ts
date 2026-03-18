/**
 * cogniRoles.ts — Centralized role constants, display maps, and type definitions
 * for the CogniBlend Workspace Mode system.
 */

/** Role priority order — highest priority first */
export const ROLE_PRIORITY = ['CA', 'CR', 'AM', 'RQ', 'CU', 'ID', 'ER', 'LC', 'FC'] as const;

/** Role code → human-readable name */
export const ROLE_DISPLAY: Record<string, string> = {
  AM: 'Account Manager',
  RQ: 'Change Requestor',
  CR: 'Challenge Creator',
  CA: 'Challenge Architect',
  CU: 'Curator',
  ID: 'Innovation Director',
  ER: 'Evaluation Reviewer',
  LC: 'Legal Compliance',
  FC: 'Finance Controller',
};

/** Role code → badge colour config */
export const ROLE_COLORS: Record<string, { label: string; bg: string; color: string }> = {
  CR: { label: 'CR', bg: 'hsl(156 42% 92%)', color: 'hsl(164 75% 25%)' },
  CU: { label: 'CU', bg: 'hsl(263 83% 95%)', color: 'hsl(263 70% 52%)' },
  ID: { label: 'ID', bg: 'hsl(212 68% 94%)', color: 'hsl(212 70% 37%)' },
  ER: { label: 'ER', bg: 'hsl(326 80% 94%)', color: 'hsl(326 68% 35%)' },
  LC: { label: 'LC', bg: 'hsl(27 100% 92%)', color: 'hsl(20 88% 40%)' },
  FC: { label: 'FC', bg: 'hsl(40 100% 92%)', color: 'hsl(28 80% 36%)' },
  AM: { label: 'AM', bg: 'hsl(170 84% 90%)', color: 'hsl(170 75% 26%)' },
  RQ: { label: 'RQ', bg: 'hsl(215 25% 95%)', color: 'hsl(215 16% 47%)' },
  CA: { label: 'CA', bg: 'hsl(212 68% 94%)', color: 'hsl(212 70% 37%)' },
};

/** Role code → primary action button config */
export const ROLE_PRIMARY_ACTION: Record<string, { label: string; route: string }> = {
  CR: { label: 'Create Challenge', route: '/cogni/challenges/new' },
  CA: { label: 'Create Challenge', route: '/cogni/challenges/new' },
  AM: { label: 'Submit Request', route: '/cogni/submit-request' },
  RQ: { label: 'Submit Request', route: '/cogni/submit-request' },
  CU: { label: 'Open Curation Queue', route: '/cogni/curation' },
  ID: { label: 'Review Approvals', route: '/cogni/approval' },
  ER: { label: 'Open Review Queue', route: '/cogni/review' },
  LC: { label: 'Legal Documents', route: '/cogni/legal' },
  FC: { label: 'Manage Escrow', route: '/cogni/escrow' },
};

/** Role code → nav paths that are "relevant" for this workspace */
export const ROLE_NAV_RELEVANCE: Record<string, string[]> = {
  AM: ['/cogni/submit-request', '/cogni/my-requests', '/cogni/dashboard'],
  RQ: ['/cogni/submit-request', '/cogni/my-requests', '/cogni/dashboard'],
  CR: ['/cogni/challenges/new', '/cogni/my-challenges', '/cogni/dashboard'],
  CA: ['/cogni/challenges/new', '/cogni/my-challenges', '/cogni/dashboard'],
  CU: ['/cogni/curation', '/cogni/dashboard'],
  ID: ['/cogni/approval', '/cogni/evaluation', '/cogni/selection', '/cogni/dashboard'],
  ER: ['/cogni/review', '/cogni/evaluation', '/cogni/dashboard'],
  LC: ['/cogni/legal', '/cogni/legal-review', '/cogni/dashboard'],
  FC: ['/cogni/escrow', '/cogni/payments', '/cogni/dashboard'],
};

/** Solver paths are always relevant regardless of active role */
export const SOLVER_PATHS = [
  '/cogni/browse',
  '/cogni/my-solutions',
  '/cogni/portfolio',
];

/**
 * Returns the highest-priority role from a set of role codes.
 */
export function getPrimaryRole(codes: Set<string>): string {
  for (const code of ROLE_PRIORITY) {
    if (codes.has(code)) return code;
  }
  return 'CR';
}

/** Context type exposed by CogniRoleProvider */
export interface CogniRoleContextType {
  /** Currently active workspace role */
  activeRole: string;
  /** All role codes the user holds (sorted by priority) */
  availableRoles: string[];
  /** Whether user holds 6+ roles */
  isSoloMode: boolean;
  /** Map of challengeId → role codes for that challenge */
  challengeRoleMap: Map<string, string[]>;
  /** Switch workspace to a different role */
  setActiveRole: (code: string) => void;
  /** Get role codes for a specific challenge */
  getRolesForChallenge: (challengeId: string) => string[];
  /** True while role data is being fetched */
  isRolesLoading: boolean;
  /** Count of challenges per role code */
  roleChallengeCount: Record<string, number>;
}
