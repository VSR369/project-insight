/**
 * deepMerge & ensureArrayItemIds — unit tests
 *
 * Covers verification matrix items:
 * - AI accept deep merge does not clobber unrelated fields
 * - Array-aware merge preserves user items when AI suggests fewer items
 * - Legacy data without id fields hydrates correctly
 */

import { describe, it, expect } from 'vitest';
import { deepMerge, ensureArrayItemIds } from '@/lib/deepMerge';

describe('deepMerge', () => {
  it('merges flat objects — target values overwrite source', () => {
    const source = { a: 1, b: 2, c: 3 };
    const target = { b: 20, d: 4 };
    const result = deepMerge(source, target);
    expect(result).toEqual({ a: 1, b: 20, c: 3, d: 4 });
  });

  it('recursively merges nested objects', () => {
    const source = { monetary: { platinum: { enabled: true, amount: 100 }, gold: { enabled: false, amount: 0 } } };
    const target = { monetary: { platinum: { amount: 200 } } };
    const result = deepMerge(source, target);
    expect(result.monetary.platinum).toEqual({ enabled: true, amount: 200 });
    expect(result.monetary.gold).toEqual({ enabled: false, amount: 0 });
  });

  // ── KEY TEST: AI accept deep merge does not clobber unrelated fields ──
  it('accepting monetary AI suggestion does NOT wipe non-monetary data', () => {
    const userData = {
      rewardType: 'both',
      currency: 'USD',
      monetary: {
        platinum: { enabled: true, amount: 5000 },
        gold: { enabled: true, amount: 3000 },
        silver: { enabled: false, amount: 0 },
      },
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship', description: '1-on-1 sessions' },
          { id: '2', label: 'Certificate', description: 'Official cert' },
          { id: '3', label: 'Networking', description: 'Industry event access' },
        ],
      },
    };

    // AI suggests only monetary changes
    const aiSuggestion = {
      monetary: {
        platinum: { amount: 7500 },
        gold: { amount: 5000 },
        silver: { enabled: true, amount: 2000 },
      },
    };

    const result = deepMerge(userData, aiSuggestion);

    // Monetary updated
    expect(result.monetary.platinum).toEqual({ enabled: true, amount: 7500 });
    expect(result.monetary.gold).toEqual({ enabled: true, amount: 5000 });
    expect(result.monetary.silver).toEqual({ enabled: true, amount: 2000 });

    // Non-monetary PRESERVED (not wiped)
    expect(result.nonMonetary.items).toHaveLength(3);
    expect(result.nonMonetary.items[0].label).toBe('Mentorship');
    expect(result.nonMonetary.items[2].label).toBe('Networking');
    expect(result.rewardType).toBe('both');
    expect(result.currency).toBe('USD');
  });

  // ── KEY TEST: Array-aware merge preserves user items ──
  it('preserves user items when AI suggests fewer items (array merge by id)', () => {
    const userData = {
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship', description: 'Original' },
          { id: '2', label: 'Certificate', description: 'Original' },
          { id: '3', label: 'Networking', description: 'User added this' },
        ],
      },
    };

    // AI suggests only 2 items (updates existing ones)
    const aiSuggestion = {
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship Program', description: 'Enhanced by AI' },
          { id: '2', label: 'Certificate of Excellence', description: 'Improved' },
        ],
      },
    };

    const result = deepMerge(userData, aiSuggestion);

    // All 3 user items preserved
    expect(result.nonMonetary.items).toHaveLength(3);
    // Matching items updated
    expect(result.nonMonetary.items[0].label).toBe('Mentorship Program');
    expect(result.nonMonetary.items[0].description).toBe('Enhanced by AI');
    expect(result.nonMonetary.items[1].label).toBe('Certificate of Excellence');
    // User's 3rd item untouched
    expect(result.nonMonetary.items[2].id).toBe('3');
    expect(result.nonMonetary.items[2].label).toBe('Networking');
    expect(result.nonMonetary.items[2].description).toBe('User added this');
  });

  it('appends new AI items not in source', () => {
    const source = {
      items: [{ id: '1', label: 'Existing' }],
    };
    const target = {
      items: [
        { id: '1', label: 'Updated' },
        { id: 'new', label: 'Brand New' },
      ],
    };
    const result = deepMerge(source, target);
    expect(result.items).toHaveLength(2);
    expect(result.items[1].id).toBe('new');
  });

  it('falls back to label identity when id is missing', () => {
    const source = {
      items: [{ label: 'Alpha', value: 1 }],
    };
    const target = {
      items: [{ label: 'Alpha', value: 99 }],
    };
    const result = deepMerge(source, target);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].value).toBe(99);
  });

  it('replaces arrays wholesale for non-identity keys', () => {
    const source = { tags: ['a', 'b', 'c'] };
    const target = { tags: ['x', 'y'] };
    const result = deepMerge(source, target);
    expect(result.tags).toEqual(['x', 'y']);
  });

  it('handles null target values', () => {
    const source = { a: 1, b: 'hello' };
    const target = { b: null };
    const result = deepMerge(source, target as any);
    expect(result.b).toBeNull();
    expect(result.a).toBe(1);
  });
});

describe('ensureArrayItemIds', () => {
  it('adds UUID ids to items missing id field', () => {
    const data = {
      nonMonetary: {
        items: [
          { label: 'No ID', description: 'Legacy' },
          { id: 'existing', label: 'Has ID', description: 'OK' },
        ],
      },
    };
    const result = ensureArrayItemIds(data);
    expect(result.nonMonetary.items[0].id).toBeDefined();
    expect(typeof result.nonMonetary.items[0].id).toBe('string');
    expect(result.nonMonetary.items[0].id.length).toBeGreaterThan(0);
    // Existing ID preserved
    expect(result.nonMonetary.items[1].id).toBe('existing');
  });

  it('only processes array keys ending in items/tiers/entries', () => {
    const data = {
      items: [{ label: 'A' }],
      tiers: [{ label: 'B' }],
      entries: [{ label: 'C' }],
      tags: [{ label: 'D' }], // NOT an identity array key
    };
    const result = ensureArrayItemIds(data);
    expect((result.items[0] as any).id).toBeDefined();
    expect((result.tiers[0] as any).id).toBeDefined();
    expect((result.entries[0] as any).id).toBeDefined();
    expect((result.tags[0] as any).id).toBeUndefined();
  });

  it('handles deeply nested structures', () => {
    const data = {
      nonMonetary: {
        items: [{ label: 'Deep' }],
      },
    };
    const result = ensureArrayItemIds(data);
    expect((result.nonMonetary.items[0] as any).id).toBeDefined();
  });

  it('returns data as-is if not an object', () => {
    expect(ensureArrayItemIds(null as any)).toBeNull();
    expect(ensureArrayItemIds(undefined as any)).toBeUndefined();
  });
});
