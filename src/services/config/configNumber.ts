/**
 * configNumber — typed access to numeric business-rule settings held in the
 * settings register (md_mpa_config). Defaults equal the seeded values and are
 * only used while the register is loading or if a row is missing/invalid, so
 * behaviour never changes when the register is unreachable.
 */

export const CONFIG_NUMBER_DEFAULTS = {
  return_reason_min_length: 10,
  hold_reason_min_length: 50,
  cancel_reason_min_length: 100,
  screening_commentary_min_length: 100,
  qa_question_min_length: 20,
  creator_response_timeout_days: 7,
  amendment_withdrawal_window_days: 7,
  amendment_reacceptance_window_days: 7,
  curator_edit_rewrite_threshold_pct: 15,
  solution_max_files: 10,
} as const;

export type ConfigNumberKey = keyof typeof CONFIG_NUMBER_DEFAULTS;

/** Parse a register value; fall back to the seeded default when absent or not a finite non-negative number. */
export function resolveConfigNumber(key: ConfigNumberKey, rawValue: string | null | undefined): number {
  if (rawValue == null || rawValue.trim() === '') return CONFIG_NUMBER_DEFAULTS[key];
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed < 0) return CONFIG_NUMBER_DEFAULTS[key];
  return parsed;
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
