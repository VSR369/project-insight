/**
 * bulkAcceptHelpers.test.ts — covers checklist item G4 (NEW gap closure).
 * Asserts the partition function NEVER throws on partial / malformed
 * suggestion stores and correctly buckets entries into regular vs
 * extended_brief vs skipped.
 */

import { describe, it, expect } from 'vitest';
import {
  partitionSuggestionsForBulkAccept,
  countPendingSuggestions,
} from '../bulkAcceptHelpers';
import type { SectionStoreEntry } from '@/types/sections';

const entry = (overrides: Partial<SectionStoreEntry> = {}): SectionStoreEntry =>
  ({
    data: null,
    aiSuggestion: null,
    aiComments: [],
    addressed: false,
    reviewStatus: 'idle',
    ...overrides,
  } as SectionStoreEntry);

describe('partitionSuggestionsForBulkAccept — G4 graceful handling', () => {
  it('G4: returns empty partition for empty input — never throws', () => {
    expect(() => partitionSuggestionsForBulkAccept({})).not.toThrow();
    const out = partitionSuggestionsForBulkAccept({});
    expect(out).toEqual({ regular: [], extendedBrief: [], skipped: [], skippedDetails: [] });
  });

  it('G4: silently ignores entries with no aiSuggestion', () => {
    const sections = {
      problem_statement: entry({ aiSuggestion: null }),
      scope: entry({ aiSuggestion: undefined as never }),
    };
    const out = partitionSuggestionsForBulkAccept(sections as never);
    expect(out.regular).toHaveLength(0);
    expect(out.extendedBrief).toHaveLength(0);
    expect(out.skipped).toHaveLength(0);
  });

  it('G4: silently ignores already-addressed suggestions', () => {
    const sections = {
      problem_statement: entry({ aiSuggestion: 'x', addressed: true }),
    };
    const out = partitionSuggestionsForBulkAccept(sections as never);
    expect(out.regular).toHaveLength(0);
  });

  it('G4: routes unknown section keys to skipped instead of crashing', () => {
    const sections = {
      not_a_real_section: entry({ aiSuggestion: 'anything' }),
    };
    const out = partitionSuggestionsForBulkAccept(sections as never);
    expect(out.skipped).toContain('not_a_real_section');
  });

  it('G4: partitions a mixed set correctly', () => {
    const sections = {
      problem_statement: entry({ aiSuggestion: '<p>new</p>' }),
      root_causes: entry({ aiSuggestion: ['cause-1', 'cause-2'] as never }),
      bogus_section: entry({ aiSuggestion: 'x' }),
      already_done: entry({ aiSuggestion: 'y', addressed: true }),
    };
    const out = partitionSuggestionsForBulkAccept(sections as never);
    expect(out.regular.map((r) => r.key)).toEqual(['problem_statement']);
    expect(out.extendedBrief.map((r) => r.key)).toEqual(['root_causes']);
    expect(out.skipped).toContain('bogus_section');
  });

  it('G4: stringifies non-string suggestions without throwing', () => {
    const sections = {
      deliverables: entry({ aiSuggestion: ['A', 'B'] as never }),
    };
    expect(() => partitionSuggestionsForBulkAccept(sections as never)).not.toThrow();
    const out = partitionSuggestionsForBulkAccept(sections as never);
    expect(out.regular[0].suggestion).toBe(JSON.stringify(['A', 'B']));
  });
});

describe('countPendingSuggestions', () => {
  it('counts only valid pending suggestions', () => {
    const sections = {
      problem_statement: entry({ aiSuggestion: 'x' }),
      scope: entry({ aiSuggestion: null }),
      bogus_section: entry({ aiSuggestion: 'x' }), // skipped — no config
      done: entry({ aiSuggestion: 'x', addressed: true }),
    };
    expect(countPendingSuggestions(sections as never)).toBe(1);
  });
});
