/**
 * governanceFlagsService — Pure resolver for legal/finance review-required flags.
 *
 * Phase 9 v4 — Prompt 2.
 *
 * Single source of truth for whether a challenge requires Legal Coordinator (LC)
 * and Finance Coordinator (FC) review. Honors:
 *   1. Explicit per-challenge flag (manual Curator override) — wins always
 *   2. Effective governance mode (challenge override → org profile)
 *      — CONTROLLED defaults both flags to true
 *      — STRUCTURED / QUICK default both flags to false
 *
 * The DB-side BIU trigger `set_challenge_review_flags_default` mirrors this
 * logic on writes; this resolver is the read-side mirror so any caller that
 * already has a challenge row in memory can ask the same question without a
 * round-trip and without re-implementing the rule.
 *
 * NEVER inline `governance_mode === 'CONTROLLED'` for a legal/finance gating
 * decision — call `resolveGovernanceFlags(challenge)` instead.
 */

import { resolveGovernanceMode, type GovernanceMode } from '@/lib/governanceMode';

/**
 * Minimal challenge shape needed to resolve review-required flags.
 * Accepts both snake_case (DB row) and camelCase (mapped client object).
 */
export interface GovernanceFlagsInput {
  lc_review_required?: boolean | null;
  lcReviewRequired?: boolean | null;
  fc_review_required?: boolean | null;
  fcReviewRequired?: boolean | null;
  governance_mode_override?: string | null;
  governanceModeOverride?: string | null;
  governance_profile?: string | null;
  governanceProfile?: string | null;
}

export interface GovernanceFlagsResult {
  /** True when LC review is required for this challenge. */
  lcRequired: boolean;
  /** True when FC review is required for this challenge. */
  fcRequired: boolean;
  /** Effective governance mode used to derive the defaults. */
  effectiveMode: GovernanceMode;
  /** How each flag was decided — useful for diagnostics/audit. */
  source: {
    lc: 'EXPLICIT' | 'DERIVED_FROM_MODE';
    fc: 'EXPLICIT' | 'DERIVED_FROM_MODE';
  };
}

function pickFirstDefined<T>(...values: Array<T | null | undefined>): T | null {
  for (const v of values) {
    if (v !== undefined && v !== null) return v;
  }
  return null;
}

/**
 * Pure function — no side effects, no IO. Deterministic for a given input.
 */
export function resolveGovernanceFlags(
  challenge: GovernanceFlagsInput | null | undefined,
): GovernanceFlagsResult {
  const rawOverride = pickFirstDefined(
    challenge?.governance_mode_override,
    challenge?.governanceModeOverride,
  );
  const rawProfile = pickFirstDefined(
    challenge?.governance_profile,
    challenge?.governanceProfile,
  );
  const effectiveMode = resolveGovernanceMode(rawOverride ?? rawProfile);
  const derivedDefault = effectiveMode === 'CONTROLLED';

  const lcExplicit = pickFirstDefined(
    challenge?.lc_review_required,
    challenge?.lcReviewRequired,
  );
  const fcExplicit = pickFirstDefined(
    challenge?.fc_review_required,
    challenge?.fcReviewRequired,
  );

  return {
    lcRequired: lcExplicit ?? derivedDefault,
    fcRequired: fcExplicit ?? derivedDefault,
    effectiveMode,
    source: {
      lc: lcExplicit === null ? 'DERIVED_FROM_MODE' : 'EXPLICIT',
      fc: fcExplicit === null ? 'DERIVED_FROM_MODE' : 'EXPLICIT',
    },
  };
}
