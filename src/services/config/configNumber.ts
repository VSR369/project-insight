/**
 * configNumber — typed access to numeric business-rule settings held in the
 * settings register (md_mpa_config). The server is the only source of values:
 * there are no client fallbacks. If any required setting is missing or not a
 * valid number, parsing throws ConfigUnavailableError and the screen shows an error.
 */

export const CONFIG_NUMBER_KEYS = [
  'return_reason_min_length',
  'hold_reason_min_length',
  'cancel_reason_min_length',
  'screening_commentary_min_length',
  'qa_question_min_length',
  'creator_response_timeout_days',
  'amendment_withdrawal_window_days',
  'amendment_reacceptance_window_days',
  'curator_edit_rewrite_threshold_pct',
  'solution_max_files',
  'solution_approach_summary_min_chars',
  'abstract_min_chars',
] as const;

export type ConfigNumberKey = (typeof CONFIG_NUMBER_KEYS)[number];
export type ConfigNumbers = Record<ConfigNumberKey, number>;

export interface ConfigRow {
  param_key: string;
  param_value: string | null;
}

export class ConfigUnavailableError extends Error {
  readonly missingKeys: string[];
  constructor(missingKeys: string[]) {
    super('Business settings could not be loaded. Please retry, or contact a Supervisor if this continues.');
    this.name = 'ConfigUnavailableError';
    this.missingKeys = missingKeys;
  }
}

function parseValue(raw: string | null | undefined): number | null {
  if (raw == null || raw.trim() === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Build the full set of numbers from register rows, or throw if any is missing/invalid. */
export function parseConfigNumbers(rows: ConfigRow[]): ConfigNumbers {
  const byKey = new Map(rows.map((r) => [r.param_key, r.param_value]));
  const result: Partial<ConfigNumbers> = {};
  const missing: string[] = [];
  for (const key of CONFIG_NUMBER_KEYS) {
    const v = parseValue(byKey.get(key));
    if (v === null) missing.push(key);
    else result[key] = v;
  }
  if (missing.length > 0) throw new ConfigUnavailableError(missing);
  return result as ConfigNumbers;
}

export const MS_PER_DAY = 24 * 60 * 60 * 1000;
