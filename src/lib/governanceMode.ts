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
 * Returns STRUCTURED for null/undefined. Falls back to STRUCTURED for unknown.
 */
export function resolveGovernanceMode(
  governanceProfile: string | null | undefined,
): GovernanceMode {
  if (!governanceProfile) return 'STRUCTURED';
  const raw = governanceProfile.toUpperCase().trim();
  if (VALID_MODES.has(raw)) return raw as GovernanceMode;
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

/* ── Tier → available governance modes ────────────────── */

/** Static fallback map used when DB data is not yet loaded */
const TIER_GOVERNANCE_FALLBACK: Record<string, GovernanceMode[]> = {
  basic:      ['QUICK'],
  standard:   ['QUICK', 'STRUCTURED'],
  premium:    ['QUICK', 'STRUCTURED', 'CONTROLLED'],
  enterprise: ['QUICK', 'STRUCTURED', 'CONTROLLED'],
};

export interface TierGovernanceRow {
  governance_mode: string;
  is_default: boolean;
}

/**
 * Returns the governance modes available for a given tier.
 * Accepts either pre-fetched DB data or a tier code string (fallback).
 */
export function getAvailableGovernanceModes(
  tierDataOrCode?: TierGovernanceRow[] | string | null,
): GovernanceMode[] {
  if (!tierDataOrCode) return ['QUICK'];

  // DB-driven: array of rows from md_tier_governance_access
  if (Array.isArray(tierDataOrCode)) {
    if (tierDataOrCode.length === 0) return ['QUICK'];
    return tierDataOrCode
      .map((row) => row.governance_mode as GovernanceMode)
      .filter((m) => VALID_MODES.has(m));
  }

  // Fallback: tier code string
  return TIER_GOVERNANCE_FALLBACK[tierDataOrCode.toLowerCase()] ?? ['QUICK'];
}

/**
 * Returns the default governance mode for a given tier.
 * Accepts either pre-fetched DB data or a tier code string (fallback).
 */
export function getDefaultGovernanceMode(
  tierDataOrCode?: TierGovernanceRow[] | string | null,
  governanceProfile?: string | null,
): GovernanceMode {
  const available = getAvailableGovernanceModes(tierDataOrCode);
  if (governanceProfile) {
    const preferred = resolveGovernanceMode(governanceProfile);
    if (available.includes(preferred)) return preferred;
  }
  // Pick the explicit default from DB data, or fallback to last available
  if (Array.isArray(tierDataOrCode)) {
    const defaultRow = tierDataOrCode.find((r) => r.is_default);
    if (defaultRow && VALID_MODES.has(defaultRow.governance_mode)) {
      return defaultRow.governance_mode as GovernanceMode;
    }
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
  tierDataOrCode?: TierGovernanceRow[] | string | null,
): GovernanceMode {
  const raw = challengeOverride ?? orgGovernanceProfile;
  const effective = resolveGovernanceMode(raw);
  const available = getAvailableGovernanceModes(tierDataOrCode);
  if (available.includes(effective)) return effective;
  return available[available.length - 1] ?? 'QUICK';
}
