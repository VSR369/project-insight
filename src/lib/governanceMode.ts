/**
 * Centralized Governance Mode Engine.
 *
 * Three governance modes: QUICK, STRUCTURED, CONTROLLED.
 * No legacy values (ENTERPRISE, LIGHTWEIGHT) — those are normalized at the DB level.
 */

export type GovernanceMode = 'QUICK' | 'STRUCTURED' | 'CONTROLLED';

const VALID_MODES: Set<string> = new Set(['QUICK', 'STRUCTURED', 'CONTROLLED']);

/**
 * Strictly validates a governance mode value.
 * Returns STRUCTURED for null/undefined. Throws for invalid non-null values.
 */
export function resolveGovernanceMode(
  governanceProfile: string | null | undefined,
): GovernanceMode {
  if (!governanceProfile) return 'STRUCTURED';
  const raw = governanceProfile.toUpperCase().trim();
  if (VALID_MODES.has(raw)) return raw as GovernanceMode;
  // Fallback for unexpected values — default to STRUCTURED
  return 'STRUCTURED';
}

/** True when the mode allows merged roles and simplified workflow */
export function isQuickMode(mode: GovernanceMode): boolean {
  return mode === 'QUICK';
}

/** True when structured or controlled governance applies */
export function isStructuredOrAbove(mode: GovernanceMode): boolean {
  return mode === 'STRUCTURED' || mode === 'CONTROLLED';
}

/** True only for the strictest governance tier */
export function isControlledMode(mode: GovernanceMode): boolean {
  return mode === 'CONTROLLED';
}

/* ── UI config for badges ────────────────────────────── */

export interface GovernanceModeConfig {
  label: string;
  bg: string;
  color: string;
  tooltip: string;
}

export const GOVERNANCE_MODE_CONFIG: Record<GovernanceMode, GovernanceModeConfig> = {
  QUICK: {
    label: 'QUICK',
    bg: '#E1F5EE',
    color: '#0F6E56',
    tooltip: 'Quick: simplified workflow with auto-completion and merged roles',
  },
  STRUCTURED: {
    label: 'STRUCTURED',
    bg: '#E6F1FB',
    color: '#185FA5',
    tooltip: 'Structured: balanced governance with manual curation and optional add-ons',
  },
  CONTROLLED: {
    label: 'CONTROLLED',
    bg: '#F3E8FF',
    color: '#6D28D9',
    tooltip: 'Controlled: full compliance with mandatory escrow, formal gates, and distinct roles',
  },
};

/* ── Tier → available governance modes (data-driven) ────────────────── */

/**
 * Returns the governance modes available for a given tier.
 * Accepts pre-fetched data from useTierGovernanceAccess hook.
 * Falls back to ['QUICK'] if no data provided.
 */
export function getAvailableGovernanceModes(
  tierAccessData?: { governance_mode: string; is_default: boolean }[],
): GovernanceMode[] {
  if (!tierAccessData || tierAccessData.length === 0) return ['QUICK'];
  return tierAccessData
    .map((row) => row.governance_mode as GovernanceMode)
    .filter((m) => VALID_MODES.has(m));
}

/**
 * Returns the default governance mode for a given tier.
 * Accepts pre-fetched data from useTierGovernanceAccess hook.
 */
export function getDefaultGovernanceMode(
  tierAccessData?: { governance_mode: string; is_default: boolean }[],
  governanceProfile?: string | null,
): GovernanceMode {
  const available = getAvailableGovernanceModes(tierAccessData);
  if (governanceProfile) {
    const preferred = resolveGovernanceMode(governanceProfile);
    if (available.includes(preferred)) return preferred;
  }
  // Pick the explicit default, or fallback to last available
  const defaultRow = tierAccessData?.find((r) => r.is_default);
  if (defaultRow && VALID_MODES.has(defaultRow.governance_mode)) {
    return defaultRow.governance_mode as GovernanceMode;
  }
  return available[available.length - 1] ?? 'QUICK';
}

/**
 * Client-side 3-layer governance resolution.
 *
 * Resolution order:
 *   1. Challenge override → if set, use it
 *   2. Org default → fallback
 *   3. Clamp against tier ceiling
 */
export function resolveChallengeGovernance(
  challengeOverride: string | null | undefined,
  orgGovernanceProfile: string | null | undefined,
  tierAccessData?: { governance_mode: string; is_default: boolean }[],
): GovernanceMode {
  const raw = challengeOverride ?? orgGovernanceProfile;
  const effective = resolveGovernanceMode(raw);
  const available = getAvailableGovernanceModes(tierAccessData);
  if (available.includes(effective)) return effective;
  return available[available.length - 1] ?? 'QUICK';
}
