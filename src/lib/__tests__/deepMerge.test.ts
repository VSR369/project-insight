/**
 * deepMerge & ensureArrayItemIds — unit tests
 *
 * Aligned to corrected test specs (Groups 6 & 7):
 * DM-01: 3 user items + 2 AI items = all 5 present after accept
 * DM-02: Same-id item updated in-place, no duplicate
 * DM-03: deepMerge with null/undefined target values is safe
 * DM-04: Primitive fields in suggestion overwrite correctly
 * A-02: Monetary accept preserves non-monetary
 * A-03: Non-monetary accept preserves monetary
 * E-03: Array keys ending in items/tiers/entries are identity-merged
 */

import { describe, it, expect } from 'vitest';
import { deepMerge, ensureArrayItemIds } from '@/lib/deepMerge';

describe('deepMerge — flat objects', () => {
  it('merges flat objects — target values overwrite source', () => {
    const source = { a: 1, b: 2, c: 3 };
    const target = { b: 20, d: 4 };
    expect(deepMerge(source, target)).toEqual({ a: 1, b: 20, c: 3, d: 4 });
  });

  it('DM-04: primitive field overwrite (rewardType change)', () => {
    const source = { rewardType: 'monetary', currency: 'USD' };
    const target = { rewardType: 'both' };
    const result = deepMerge(source, target);
    expect(result.rewardType).toBe('both');
    expect(result.currency).toBe('USD');
  });

  it('handles null target values — overwrites to null', () => {
    const source = { a: 1, b: 'hello' };
    const target = { b: null };
    const result = deepMerge(source, target as any);
    expect(result.b).toBeNull();
    expect(result.a).toBe(1);
  });
});

describe('deepMerge — nested objects', () => {
  it('recursively merges nested objects preserving untouched keys', () => {
    const source = {
      monetary: {
        platinum: { enabled: true, amount: 100 },
        gold: { enabled: false, amount: 0 },
      },
    };
    const target = { monetary: { platinum: { amount: 200 } } };
    const result = deepMerge(source, target);
    expect(result.monetary.platinum).toEqual({ enabled: true, amount: 200 });
    expect(result.monetary.gold).toEqual({ enabled: false, amount: 0 });
  });

  it('A-02: monetary AI suggestion does NOT wipe non-monetary data', () => {
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
    // Non-monetary PRESERVED
    expect(result.nonMonetary.items).toHaveLength(3);
    expect(result.nonMonetary.items[0].label).toBe('Mentorship');
    expect(result.nonMonetary.items[2].label).toBe('Networking');
    expect(result.rewardType).toBe('both');
    expect(result.currency).toBe('USD');
  });

  it('A-03: non-monetary AI suggestion does NOT wipe monetary data', () => {
    const userData = {
      rewardType: 'both',
      monetary: {
        platinum: { enabled: true, amount: 5000 },
        gold: { enabled: true, amount: 3000 },
        silver: { enabled: false, amount: 0 },
      },
      nonMonetary: {
        items: [{ id: '1', label: 'Mentorship', description: 'Sessions' }],
      },
    };

    const aiSuggestion = {
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship Program', description: 'Enhanced' },
          { id: 'new1', label: 'Gift Voucher', description: 'AI added' },
        ],
      },
    };

    const result = deepMerge(userData, aiSuggestion);
    // Monetary PRESERVED
    expect(result.monetary.platinum.amount).toBe(5000);
    expect(result.monetary.platinum.enabled).toBe(true);
    expect(result.monetary.gold.amount).toBe(3000);
    // Non-monetary updated + appended
    expect(result.nonMonetary.items).toHaveLength(2);
    expect(result.nonMonetary.items[0].label).toBe('Mentorship Program');
    expect(result.nonMonetary.items[1].label).toBe('Gift Voucher');
  });
});

describe('deepMerge — array-aware merge by identity', () => {
  it('DM-01: 3 user items + 2 new AI items = 5 total', () => {
    const userData = {
      nonMonetary: {
        items: [
          { id: 'a', label: 'A', description: 'User A' },
          { id: 'b', label: 'B', description: 'User B' },
          { id: 'c', label: 'C', description: 'User C' },
        ],
      },
    };

    const aiSuggestion = {
      nonMonetary: {
        items: [
          { id: 'd', label: 'D', description: 'AI D' },
          { id: 'e', label: 'E', description: 'AI E' },
        ],
      },
    };

    const result = deepMerge(userData, aiSuggestion);
    expect(result.nonMonetary.items).toHaveLength(5);
    expect(result.nonMonetary.items.map((i: any) => i.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('DM-02: same-id item updated in-place — no duplicate', () => {
    const source = {
      items: [{ id: 'abc', label: 'Prize voucher', value: 100 }],
    };
    const target = {
      items: [{ id: 'abc', label: 'Premium prize voucher' }],
    };
    const result = deepMerge(source, target);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].label).toBe('Premium prize voucher');
    expect(result.items[0].value).toBe(100); // preserved from source
  });

  it('preserves user items when AI suggests fewer (2 AI vs 3 user)', () => {
    const userData = {
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship', description: 'Original' },
          { id: '2', label: 'Certificate', description: 'Original' },
          { id: '3', label: 'Networking', description: 'User added this' },
        ],
      },
    };

    const aiSuggestion = {
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship Program', description: 'Enhanced by AI' },
          { id: '2', label: 'Certificate of Excellence', description: 'Improved' },
        ],
      },
    };

    const result = deepMerge(userData, aiSuggestion);
    expect(result.nonMonetary.items).toHaveLength(3);
    expect(result.nonMonetary.items[0].label).toBe('Mentorship Program');
    expect(result.nonMonetary.items[1].label).toBe('Certificate of Excellence');
    expect(result.nonMonetary.items[2].id).toBe('3');
    expect(result.nonMonetary.items[2].description).toBe('User added this');
  });

  it('falls back to label identity when id is missing', () => {
    const source = { items: [{ label: 'Alpha', value: 1 }] };
    const target = { items: [{ label: 'Alpha', value: 99 }] };
    const result = deepMerge(source, target);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].value).toBe(99);
  });

  it('replaces arrays wholesale for non-identity keys (tags, domain_tags)', () => {
    const source = { tags: ['a', 'b', 'c'] };
    const target = { tags: ['x', 'y'] };
    expect(deepMerge(source, target).tags).toEqual(['x', 'y']);
  });

  it('merges tiers array by identity (suffix match)', () => {
    const source = { tiers: [{ id: 't1', name: 'Gold', amount: 100 }] };
    const target = { tiers: [{ id: 't1', amount: 200 }] };
    const result = deepMerge(source, target);
    expect(result.tiers).toHaveLength(1);
    expect(result.tiers[0].amount).toBe(200);
    expect(result.tiers[0].name).toBe('Gold');
  });

  it('merges entries array by identity (suffix match)', () => {
    const source = { entries: [{ id: 'e1', text: 'Original' }] };
    const target = { entries: [{ id: 'e1', text: 'Updated' }, { id: 'e2', text: 'New' }] };
    const result = deepMerge(source, target);
    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].text).toBe('Updated');
    expect(result.entries[1].text).toBe('New');
  });
});

describe('ensureArrayItemIds — legacy data migration (P-06)', () => {
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
    expect(result.nonMonetary.items[1].id).toBe('existing');
  });

  it('only processes array keys ending in items/tiers/entries', () => {
    const data = {
      items: [{ label: 'A' }],
      tiers: [{ label: 'B' }],
      entries: [{ label: 'C' }],
      tags: [{ label: 'D' }],
    };
    const result = ensureArrayItemIds(data);
    expect((result.items[0] as any).id).toBeDefined();
    expect((result.tiers[0] as any).id).toBeDefined();
    expect((result.entries[0] as any).id).toBeDefined();
    expect((result.tags[0] as any).id).toBeUndefined();
  });

  it('handles deeply nested structures', () => {
    const data = { nonMonetary: { items: [{ label: 'Deep' }] } };
    const result = ensureArrayItemIds(data);
    expect((result.nonMonetary.items[0] as any).id).toBeDefined();
  });

  it('returns null/undefined as-is without crash', () => {
    expect(ensureArrayItemIds(null as any)).toBeNull();
    expect(ensureArrayItemIds(undefined as any)).toBeUndefined();
  });
});
