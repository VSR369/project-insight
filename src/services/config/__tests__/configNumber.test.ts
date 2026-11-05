import { describe, expect, it } from 'vitest';
import { CONFIG_NUMBER_KEYS, ConfigUnavailableError, parseConfigNumbers, type ConfigRow } from '../configNumber';

const SERVER_ROWS: ConfigRow[] = [
  { param_key: 'return_reason_min_length', param_value: '10' },
  { param_key: 'hold_reason_min_length', param_value: '50' },
  { param_key: 'cancel_reason_min_length', param_value: '100' },
  { param_key: 'screening_commentary_min_length', param_value: '100' },
  { param_key: 'qa_question_min_length', param_value: '20' },
  { param_key: 'creator_response_timeout_days', param_value: '7' },
  { param_key: 'amendment_withdrawal_window_days', param_value: '7' },
  { param_key: 'amendment_reacceptance_window_days', param_value: '7' },
  { param_key: 'curator_edit_rewrite_threshold_pct', param_value: '15' },
  { param_key: 'solution_max_files', param_value: '10' },
  { param_key: 'solution_approach_summary_min_chars', param_value: '200' },
  { param_key: 'abstract_min_chars', param_value: '300' },
];

describe('parseConfigNumbers (server is the only source)', () => {
  it('Approach Summary minimum is 200 and abstract minimum stays 300', () => {
    const n = parseConfigNumbers(SERVER_ROWS);
    expect(n.solution_approach_summary_min_chars).toBe(200);
    expect(n.abstract_min_chars).toBe(300);
  });

  it('uses the register value exactly as the server sends it', () => {
    const rows = SERVER_ROWS.map((r) => (r.param_key === 'return_reason_min_length' ? { ...r, param_value: '25' } : r));
    expect(parseConfigNumbers(rows).return_reason_min_length).toBe(25);
  });

  it('no client fallback: a missing setting raises an error instead of a default', () => {
    const rows = SERVER_ROWS.filter((r) => r.param_key !== 'hold_reason_min_length');
    expect(() => parseConfigNumbers(rows)).toThrow(ConfigUnavailableError);
  });

  it('no client fallback: an unreadable register (no rows) raises an error naming every setting', () => {
    try {
      parseConfigNumbers([]);
      expect.unreachable();
    } catch (e) {
      expect((e as ConfigUnavailableError).missingKeys).toHaveLength(CONFIG_NUMBER_KEYS.length);
    }
  });

  it('invalid or negative values raise an error', () => {
    const bad = SERVER_ROWS.map((r) => (r.param_key === 'cancel_reason_min_length' ? { ...r, param_value: '-5' } : r));
    expect(() => parseConfigNumbers(bad)).toThrow(ConfigUnavailableError);
  });

  it('accepts zero (e.g. commentary not required)', () => {
    const rows = SERVER_ROWS.map((r) => (r.param_key === 'screening_commentary_min_length' ? { ...r, param_value: '0' } : r));
    expect(parseConfigNumbers(rows).screening_commentary_min_length).toBe(0);
  });
});
