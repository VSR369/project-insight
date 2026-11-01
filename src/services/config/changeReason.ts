/**
 * Change-reason rule for settings changes (CFG-001 / DEF-0533).
 * Lengths come from the settings register; the defaults mirror the seeded values.
 */

export const CHANGE_REASON_MIN_KEY = 'config_change_reason_min_length';
export const CHANGE_REASON_MAX_KEY = 'config_change_reason_max_length';
export const CHANGE_REASON_DEFAULT_MIN = 10;
export const CHANGE_REASON_DEFAULT_MAX = 500;

export interface ChangeReasonLimits {
  min: number;
  max: number;
}

export function resolveReasonLimits(
  entries: ReadonlyArray<{ param_key: string; param_value: string | null }> | undefined,
): ChangeReasonLimits {
  const read = (key: string, fallback: number): number => {
    const raw = entries?.find((e) => e.param_key === key)?.param_value;
    const n = raw == null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return {
    min: read(CHANGE_REASON_MIN_KEY, CHANGE_REASON_DEFAULT_MIN),
    max: read(CHANGE_REASON_MAX_KEY, CHANGE_REASON_DEFAULT_MAX),
  };
}

/** Returns an error message, or null when the reason is acceptable. */
export function validateChangeReason(reason: string, limits: ChangeReasonLimits): string | null {
  const len = reason.trim().length;
  if (len < limits.min || len > limits.max) {
    return `Enter a reason of ${limits.min} to ${limits.max} characters for this change.`;
  }
  return null;
}
