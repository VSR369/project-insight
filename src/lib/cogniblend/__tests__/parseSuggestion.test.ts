/**
 * parseSuggestion.test.ts — covers checklist item C10.
 * Asserts each section format gets the correct native shape, and that
 * malformed JSON falls back to the raw string without throwing.
 */

import { describe, it, expect } from 'vitest';
import { parseSuggestionForSection } from '../parseSuggestion';

describe('parseSuggestionForSection — happy paths', () => {
  it('rich_text section: returns string as-is', () => {
    const html = '<p>Hello world</p>';
    expect(parseSuggestionForSection('problem_statement', html)).toBe(html);
  });

  it('line_items section: parses JSON array', () => {
    const out = parseSuggestionForSection('deliverables', '["A","B","C"]');
    expect(out).toEqual(['A', 'B', 'C']);
  });

  it('table section: parses JSON array of row objects', () => {
    const raw = '[{"criterion_name":"Quality","weight":40}]';
    const out = parseSuggestionForSection('evaluation_criteria', raw);
    expect(Array.isArray(out)).toBe(true);
    expect((out as Array<Record<string, unknown>>)[0].criterion_name).toBe('Quality');
  });

  it('checkbox_single section: parses JSON object', () => {
    const out = parseSuggestionForSection('maturity_level', '{"value":"POC"}');
    expect(out).toEqual({ value: 'POC' });
  });
});

describe('parseSuggestionForSection — malformed input never throws', () => {
  it('falls back to raw string when JSON parse fails for line_items', () => {
    const broken = 'not-json[[[';
    expect(parseSuggestionForSection('deliverables', broken)).toBe(broken);
  });

  it('falls back to raw string when JSON parses to wrong shape (object for table)', () => {
    const wrong = '{"not":"an-array"}';
    expect(parseSuggestionForSection('evaluation_criteria', wrong)).toBe(wrong);
  });

  it('falls back when checkbox_single receives an array', () => {
    const wrong = '[1,2,3]';
    expect(parseSuggestionForSection('maturity_level', wrong)).toBe(wrong);
  });

  it('returns raw string for unknown section keys', () => {
    expect(parseSuggestionForSection('not_a_section', 'anything')).toBe('anything');
  });
});
