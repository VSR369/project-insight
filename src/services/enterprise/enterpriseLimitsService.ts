/**
 * enterpriseLimitsService — Pure resolution helpers for Enterprise overrides.
 *
 * Owns the single source of truth for the `override ?? tierDefault` rule
 * and for type-safe feature_gate boolean coercion. Stateless / no I/O,
 * so it is trivially unit-testable and safe to import from hooks, services,
 * or edge functions alike.
 *
 * IMPORTANT: keep this file dependency-free. Any future caller (RPC validator,
 * billing engine) should be able to import without pulling in React.
 */

export type FeatureGateMap = Record<string, unknown>;

/**
 * Returns the effective limit for an Enterprise org.
 * - If `override` is a positive integer, it wins.
 * - Otherwise the tier default applies.
 * - `null` on both sides means "unlimited" (caller decides what that renders as).
 */
export function resolveLimit(
  override: number | null | undefined,
  tierDefault: number | null | undefined,
): number | null {
  if (typeof override === 'number' && Number.isFinite(override) && override > 0) {
    return Math.floor(override);
  }
  if (typeof tierDefault === 'number' && Number.isFinite(tierDefault) && tierDefault > 0) {
    return Math.floor(tierDefault);
  }
  return null;
}

/**
 * Type-safe feature_gate read.
 * Returns true ONLY when the JSONB value is the boolean literal `true`.
 * Strings like "yes", numbers like 1, or missing keys all coerce to false —
 * which is exactly the failure mode the 10c.6 trigger is designed to prevent
 * at write-time, but this helper is the read-side defence-in-depth.
 */
export function isFeatureGateEnabled(
  gates: FeatureGateMap | null | undefined,
  key: string,
): boolean {
  if (!gates || typeof gates !== 'object') return false;
  const value = (gates as Record<string, unknown>)[key];
  return value === true;
}
