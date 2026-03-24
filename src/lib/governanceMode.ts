/**
 * Centralized Governance Mode Engine.
 *
 * Maps the DB column `governance_profile` (which stores LIGHTWEIGHT, ENTERPRISE,
 * QUICK, STRUCTURED, CONTROLLED) into the 3-mode system.
 *
 * Backward-compatible:
 *   LIGHTWEIGHT / QUICK → QUICK
 *   ENTERPRISE (default) → STRUCTURED
 *   CONTROLLED → CONTROLLED
 *
 * The `compliance_level` field on the org/challenge can further differentiate
 * ENTERPRISE into STRUCTURED vs CONTROLLED, but that is supervisor-configured
 * in master data and stored directly as the governance_profile value.
 */

export type GovernanceMode = 'QUICK' | 'STRUCTURED' | 'CONTROLLED';

/**
 * Resolve a raw governance_profile DB value into the canonical 3-mode value.
 */
export function resolveGovernanceMode(
  governanceProfile: string | null | undefined,
): GovernanceMode {
  const raw = (governanceProfile ?? '').toUpperCase().trim();

  if (raw === 'LIGHTWEIGHT' || raw === 'QUICK') return 'QUICK';
  if (raw === 'CONTROLLED') return 'CONTROLLED';
  // ENTERPRISE or STRUCTURED or anything else → STRUCTURED
  return 'STRUCTURED';
}

/** True when the mode behaves like the old LIGHTWEIGHT (auto-complete, merged roles) */
export function isQuickMode(mode: GovernanceMode): boolean {
  return mode === 'QUICK';
}

/** True when structured or controlled governance applies (review rigor, anonymity) */
export function isStructuredOrAbove(mode: GovernanceMode): boolean {
  return mode === 'STRUCTURED' || mode === 'CONTROLLED';
}

/** @deprecated Use isStructuredOrAbove instead */
export const isEnterpriseGrade = isStructuredOrAbove;

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

export const TIER_GOVERNANCE_MODES: Record<string, GovernanceMode[]> = {
  basic:      ['QUICK'],
  standard:   ['QUICK', 'STRUCTURED'],
  premium:    ['QUICK', 'STRUCTURED', 'CONTROLLED'],
  enterprise: ['QUICK', 'STRUCTURED', 'CONTROLLED'],
};

/**
 * Returns the governance modes available for a given subscription tier.
 */
export function getAvailableGovernanceModes(tierCode: string | null | undefined): GovernanceMode[] {
  return TIER_GOVERNANCE_MODES[(tierCode ?? 'basic').toLowerCase()] ?? ['QUICK'];
}

/**
 * Returns the best default governance mode for a given tier.
 * BASIC → always QUICK; Standard → STRUCTURED; Premium/Enterprise → STRUCTURED.
 * Optionally accepts an org's governance profile to resolve the preferred mode,
 * clamping it to available modes for the tier.
 */
export function getDefaultGovernanceMode(
  tierCode: string | null | undefined,
  governanceProfile?: string | null,
): GovernanceMode {
  const available = getAvailableGovernanceModes(tierCode);
  if (governanceProfile) {
    const preferred = resolveGovernanceMode(governanceProfile);
    if (available.includes(preferred)) return preferred;
  }
  // Fallback: pick the highest available mode (last in the array)
  return available[available.length - 1] ?? 'QUICK';
}

/**
 * Client-side 3-layer governance resolution (mirrors SQL `resolve_challenge_governance`).
 *
 * Resolution order:
 *   1. Challenge override (`governance_mode_override`) — if set, use it
 *   2. Org default (`governance_profile`) — fallback
 *   3. Clamp against tier ceiling
 */
export function resolveChallengeGovernance(
  challengeOverride: string | null | undefined,
  orgGovernanceProfile: string | null | undefined,
  tierCode: string | null | undefined,
): GovernanceMode {
  const raw = challengeOverride ?? orgGovernanceProfile;
  const effective = resolveGovernanceMode(raw);
  const available = getAvailableGovernanceModes(tierCode);
  if (available.includes(effective)) return effective;
  // Clamp to highest allowed
  return available[available.length - 1] ?? 'QUICK';
}
