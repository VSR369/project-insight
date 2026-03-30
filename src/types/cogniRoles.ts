/**
 * cogniRoles.ts — Centralized role constants, display maps, and type definitions
 * for the CogniBlend Workspace Mode system.
 *
 * ROLE ARCHITECTURE v2: 2 core roles (CR, CU) + 3 support roles (ER, LC, FC)
 * Removed: AM, RQ, CA, ID
 */

/** Role priority order — highest priority first */
export const ROLE_PRIORITY: string[] = ['CR', 'CU', 'ER', 'LC', 'FC'];

/** Role code → human-readable name */
export const ROLE_DISPLAY: Record<string, string> = {
  CR: 'Challenge Creator',
  CU: 'Curator',
  ER: 'Evaluation Reviewer',
  LC: 'Legal Compliance',
  FC: 'Finance Controller',
};

/** Legacy role codes that map to CR for backward compatibility */
export const LEGACY_ROLE_ALIASES: Record<string, string> = {
  AM: 'CR',
  RQ: 'CR',
  CA: 'CR',
  ID: 'CU',
};

/** Role code → badge colour config */
export const ROLE_COLORS: Record<string, { label: string; bg: string; color: string }> = {
  CR: { label: 'CR', bg: 'hsl(156 42% 92%)', color: 'hsl(164 75% 25%)' },
  CU: { label: 'CU', bg: 'hsl(263 83% 95%)', color: 'hsl(263 70% 52%)' },
  ER: { label: 'ER', bg: 'hsl(326 80% 94%)', color: 'hsl(326 68% 35%)' },
  LC: { label: 'LC', bg: 'hsl(27 100% 92%)', color: 'hsl(20 88% 40%)' },
  FC: { label: 'FC', bg: 'hsl(40 100% 92%)', color: 'hsl(28 80% 36%)' },
};

/** Role code → primary action button config */
export const ROLE_PRIMARY_ACTION: Record<string, { label: string; route: string }> = {
  CR: { label: 'Create Challenge', route: '/cogni/challenges/create' },
  CU: { label: 'Open Curation Queue', route: '/cogni/curation' },
  ER: { label: 'Open Review Queue', route: '/cogni/review' },
  LC: { label: 'Legal Workspace', route: '/cogni/lc-queue' },
  FC: { label: 'Manage Escrow', route: '/cogni/escrow' },
};

/** Role code → nav paths that are "relevant" for this workspace */
export const ROLE_NAV_RELEVANCE: Record<string, string[]> = {
  CR: ['/cogni/challenges/create', '/cogni/challenges/new', '/cogni/my-challenges', '/cogni/dashboard'],
  CU: ['/cogni/curation', '/cogni/dashboard'],
  ER: ['/cogni/review', '/cogni/evaluation', '/cogni/dashboard'],
  LC: ['/cogni/lc-queue', '/cogni/legal', '/cogni/legal-review', '/cogni/dashboard'],
  FC: ['/cogni/escrow', '/cogni/payments', '/cogni/dashboard'],
};

/** Solver paths — only relevant for non-seeking-org users */
export const SOLVER_PATHS = [
  '/cogni/browse',
  '/cogni/my-solutions',
  '/cogni/portfolio',
];

/**
 * Resolves a role code, mapping legacy codes to their current equivalents.
 */
export function resolveRoleCode(code: string): string {
  return LEGACY_ROLE_ALIASES[code] ?? code;
}

/**
 * Returns the highest-priority role from a set of role codes.
 * Legacy codes are resolved to their current equivalents first.
 */
export function getPrimaryRole(codes: Set<string>): string {
  // Resolve legacy codes
  const resolvedCodes = new Set<string>();
  for (const code of codes) {
    resolvedCodes.add(resolveRoleCode(code));
  }
  for (const code of ROLE_PRIORITY) {
    if (resolvedCodes.has(code)) return code;
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
