import { describe, expect, it } from 'vitest';
import {
  CONFIDENTIAL_ELIGIBLE_KEYS,
  extractConfidentialFieldValues,
  sanitizeConfidentialKeys,
  toggleConfidentialKey,
} from '../confidentialSections';

describe('CONFIDENTIAL_ELIGIBLE_KEYS (BR-CHL-P09)', () => {
  it('only offers extended-brief keys, never top-level challenge columns', () => {
    const keys = CONFIDENTIAL_ELIGIBLE_KEYS.map((f) => f.key);
    expect(keys).not.toContain('title');
    expect(keys).not.toContain('problem_statement');
    expect(keys).not.toContain('scope');
    expect(keys).toContain('root_causes');
    expect(keys).toContain('affected_stakeholders');
  });
});

describe('toggleConfidentialKey', () => {
  it('adds a key that is not present', () => {
    expect(toggleConfidentialKey([], 'root_causes')).toEqual(['root_causes']);
  });

  it('removes a key that is present', () => {
    expect(toggleConfidentialKey(['root_causes'], 'root_causes')).toEqual([]);
  });

  it('does not mutate the input array', () => {
    const input = ['root_causes'];
    toggleConfidentialKey(input, 'preferred_approach');
    expect(input).toEqual(['root_causes']);
  });
});

describe('sanitizeConfidentialKeys', () => {
  it('drops keys that are not extended-brief keys', () => {
    expect(sanitizeConfidentialKeys(['root_causes', 'title', 'reward_structure'])).toEqual(['root_causes']);
  });
});

describe('extractConfidentialFieldValues', () => {
  it('unwraps the value envelope written by fn_extract_confidential_brief', () => {
    const rows = [
      { section_key: 'root_causes', content: { value: ['Legacy systems'] } },
      { section_key: 'context_background', content: { value: '<p>Context</p>' } },
    ];
    expect(extractConfidentialFieldValues(rows)).toEqual({
      root_causes: ['Legacy systems'],
      context_background: '<p>Context</p>',
    });
  });

  it('skips rows without a value envelope', () => {
    expect(extractConfidentialFieldValues([{ section_key: 'root_causes', content: null }])).toEqual({});
  });
});
