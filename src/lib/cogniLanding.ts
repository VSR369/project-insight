/**
 * cogniLanding — Pure helper that picks the best CogniBlend landing route
 * for a user based on their pool/challenge role codes.
 *
 * Priority: LC (R9) > FC (R8) > everything else (curator/creator/reviewer
 * → generic dashboard). LC and FC get role-specific inboxes so they don't
 * land on the curator-styled dashboard.
 */

const LC_CODES = new Set(['R9', 'LC']);
const FC_CODES = new Set(['R8', 'FC']);
const CURATOR_CODES = new Set(['R5_MP', 'R5_AGG', 'CU', 'CR']);
const REVIEWER_CODES = new Set(['R7_MP', 'R7_AGG', 'ER']);

export function pickCogniLandingRoute(roleCodes: string[]): string {
  const set = new Set(roleCodes);
  const has = (codes: Set<string>) => Array.from(codes).some((c) => set.has(c));

  // If a user holds curator/creator/reviewer codes, default to dashboard
  // (multi-role users see the rich dashboard rather than a single inbox).
  if (has(CURATOR_CODES) || has(REVIEWER_CODES)) {
    return '/cogni/dashboard';
  }
  if (has(LC_CODES)) return '/cogni/lc-queue';
  if (has(FC_CODES)) return '/cogni/fc-queue';
  return '/cogni/dashboard';
}
