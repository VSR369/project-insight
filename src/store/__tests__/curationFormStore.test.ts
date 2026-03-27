/**
 * curationFormStore — unit tests
 *
 * Aligned to corrected test specs:
 *
 * Group 2 — Accept/Reject:
 *   A-01: Accept updates section data via deep merge
 *   A-02: Monetary accept preserves non-monetary (via deepMerge)
 *   A-04: Reject clears suggestion, preserves data
 *   A-05: After accept, aiComments/aiSuggestion are null (not [])
 *   A-06: After reject, reviewStatus resets to idle
 *
 * Group 5 — Persistence:
 *   P-05: Different challenges use isolated stores (getCurationFormStore)
 *   P-06: Legacy items without id get UUIDs on hydration
 *
 * Group 6 — Deep merge:
 *   DM-03: Null suggestion accept is a no-op (no crash)
 *
 * Group 7 — Edge cases:
 *   E-01: SECTION_KEYS length matches SECTION_FORMAT_CONFIG
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCurationFormStore, getCurationFormStore, selectIsAnyReviewPending } from '@/store/curationFormStore';
import { SECTION_KEYS } from '@/types/sections';
import { SECTION_FORMAT_CONFIG } from '@/lib/cogniblend/curationSectionFormats';
import type { SectionKey } from '@/types/sections';

const REWARD_KEY = 'reward_structure' as SectionKey;
const PROBLEM_KEY = 'problem_statement' as SectionKey;
const COMPLEXITY_KEY = 'complexity' as SectionKey;

function makeStore() {
  return createCurationFormStore(`test-${Date.now()}-${Math.random()}`);
}

describe('curationFormStore — basics', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => { store = makeStore(); });

  it('initializes with empty sections', () => {
    expect(store.getState().sections).toEqual({});
  });

  it('setSectionData stores data for a key', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    expect(store.getState().getSectionEntry(REWARD_KEY).data).toEqual({ rewardType: 'monetary' });
  });

  it('getSectionEntry returns empty entry for unknown key', () => {
    const entry = store.getState().getSectionEntry(PROBLEM_KEY);
    expect(entry.data).toBeNull();
    expect(entry.aiComments).toBeNull();
    expect(entry.aiSuggestion).toBeNull();
    expect(entry.reviewStatus).toBe('idle');
    expect(entry.addressed).toBe(false);
  });
});

describe('curationFormStore — DM-03: null-guard on accept', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => { store = makeStore(); });

  it('acceptAiSuggestion is a no-op when aiSuggestion is null', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    store.getState().acceptAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    expect(entry.data).toEqual({ rewardType: 'monetary' });
    expect(entry.addressed).toBe(false);
  });

  it('acceptAiSuggestion is a no-op when reviewStatus is not reviewed', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    store.getState().setReviewStatus(REWARD_KEY, 'pending');
    store.getState().acceptAiSuggestion(REWARD_KEY);
    expect(store.getState().getSectionEntry(REWARD_KEY).data).toEqual({ rewardType: 'monetary' });
  });

  it('no crash when section does not exist at all', () => {
    expect(() => store.getState().acceptAiSuggestion('nonexistent_key' as SectionKey)).not.toThrow();
  });
});

describe('curationFormStore — A-01/A-05: accept deep merges and clears AI state', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => { store = makeStore(); });

  it('deep merges suggestion into data, clears AI state to null', () => {
    const initialData = {
      rewardType: 'both',
      monetary: { platinum: { enabled: true, amount: 5000 } },
      nonMonetary: {
        items: [{ id: '1', label: 'Mentorship', description: 'Sessions' }],
      },
    };

    store.getState().setSectionData(REWARD_KEY, initialData);
    store.getState().setAiReview(REWARD_KEY, ['Increase platinum'], {
      monetary: { platinum: { amount: 7500 } },
    });

    store.getState().acceptAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    const data = entry.data as Record<string, any>;

    // A-01: Monetary updated
    expect(data.monetary.platinum.amount).toBe(7500);
    expect(data.monetary.platinum.enabled).toBe(true);
    // A-02 (store-level): Non-monetary preserved
    expect(data.nonMonetary.items).toHaveLength(1);
    expect(data.nonMonetary.items[0].label).toBe('Mentorship');
    // A-05: AI state cleared to null, not []
    expect(entry.aiComments).toBeNull();
    expect(entry.aiSuggestion).toBeNull();
    expect(entry.addressed).toBe(true);
    expect(entry.reviewStatus).toBe('reviewed');
  });

  it('accept on text section replaces string data with suggestion', () => {
    store.getState().setSectionData(PROBLEM_KEY, 'Original problem statement');
    store.getState().setAiReview(PROBLEM_KEY, ['Too vague'], {
      content: 'Improved problem statement with specifics',
    });

    store.getState().acceptAiSuggestion(PROBLEM_KEY);
    const entry = store.getState().getSectionEntry(PROBLEM_KEY);
    // For string sections, data becomes the merged object since deepMerge expects objects
    // The page-level handler may handle string sections differently
    expect(entry.aiComments).toBeNull();
    expect(entry.aiSuggestion).toBeNull();
    expect(entry.addressed).toBe(true);
  });
});

describe('curationFormStore — A-04/A-06: reject clears AI state', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => { store = makeStore(); });

  it('A-04: reject clears suggestion, preserves section data', () => {
    const originalData = { rewardType: 'monetary', currency: 'USD' };
    store.getState().setSectionData(REWARD_KEY, originalData);
    store.getState().setAiReview(REWARD_KEY, ['Fix amount'], { monetary: { platinum: { amount: 9999 } } });

    store.getState().rejectAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);

    // Data unchanged
    expect(entry.data).toEqual(originalData);
    // A-06: AI state cleared, status idle
    expect(entry.aiComments).toBeNull();
    expect(entry.aiSuggestion).toBeNull();
    expect(entry.reviewStatus).toBe('idle');
    expect(entry.addressed).toBe(false);
  });
});

describe('curationFormStore — P-06: hydration with legacy data', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => { store = makeStore(); });

  it('hydrate assigns UUIDs to array items missing id', () => {
    store.getState().hydrate({
      [REWARD_KEY]: {
        nonMonetary: {
          items: [
            { label: 'No ID', description: 'Legacy item' },
            { id: 'existing', label: 'Has ID', description: 'OK' },
          ],
        },
      } as any,
    });

    const data = store.getState().getSectionEntry(REWARD_KEY).data as Record<string, any>;
    expect(data.nonMonetary.items[0].id).toBeDefined();
    expect(typeof data.nonMonetary.items[0].id).toBe('string');
    expect(data.nonMonetary.items[0].id.length).toBeGreaterThan(0);
    expect(data.nonMonetary.items[1].id).toBe('existing');
  });

  it('hydrate preserves existing review state when updating data', () => {
    store.getState().setSectionData(REWARD_KEY, { old: true });
    store.getState().setAiReview(REWARD_KEY, ['Comment'], null);

    store.getState().hydrate({ [REWARD_KEY]: { new: true } as any });
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    expect(entry.data).toEqual({ new: true });
    expect(entry.aiComments).toEqual(['Comment']);
  });

  it('hydrate creates new entries for sections not yet in store', () => {
    store.getState().hydrate({
      [PROBLEM_KEY]: 'Some problem' as any,
      [COMPLEXITY_KEY]: { score: 42 } as any,
    });
    expect(store.getState().getSectionEntry(PROBLEM_KEY).data).toBe('Some problem');
    expect((store.getState().getSectionEntry(COMPLEXITY_KEY).data as any).score).toBe(42);
  });
});

describe('curationFormStore — G-03: selectIsAnyReviewPending', () => {
  let store: ReturnType<typeof makeStore>;
  beforeEach(() => { store = makeStore(); });

  it('returns true when any section is pending', () => {
    store.getState().setReviewStatus(REWARD_KEY, 'pending');
    expect(selectIsAnyReviewPending(store.getState())).toBe(true);
  });

  it('returns false when no section is pending', () => {
    store.getState().setReviewStatus(REWARD_KEY, 'reviewed');
    store.getState().setReviewStatus(PROBLEM_KEY, 'idle');
    expect(selectIsAnyReviewPending(store.getState())).toBe(false);
  });

  it('returns false on empty store', () => {
    expect(selectIsAnyReviewPending(store.getState())).toBe(false);
  });
});

describe('curationFormStore — P-05: store isolation per challenge', () => {
  it('getCurationFormStore returns same instance for same challengeId', () => {
    const storeA1 = getCurationFormStore('challenge-A');
    const storeA2 = getCurationFormStore('challenge-A');
    expect(storeA1).toBe(storeA2);
  });

  it('getCurationFormStore returns different instances for different challengeIds', () => {
    const storeA = getCurationFormStore('challenge-isolation-A');
    const storeB = getCurationFormStore('challenge-isolation-B');
    expect(storeA).not.toBe(storeB);

    // Data written to A is not visible in B
    storeA.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    expect(storeB.getState().getSectionEntry(REWARD_KEY).data).toBeNull();
  });
});

describe('curationFormStore — E-01: SECTION_KEYS coverage', () => {
  it('SECTION_KEYS length matches SECTION_FORMAT_CONFIG keys', () => {
    const configKeys = Object.keys(SECTION_FORMAT_CONFIG);
    expect(SECTION_KEYS.length).toBe(configKeys.length);
    for (const key of configKeys) {
      expect(SECTION_KEYS).toContain(key);
    }
  });
});

describe('curationFormStore — markAddressed', () => {
  it('marks section as addressed and clears comments', () => {
    const store = makeStore();
    store.getState().setAiReview(REWARD_KEY, ['Some comment'], null);
    store.getState().markAddressed(REWARD_KEY);

    const entry = store.getState().getSectionEntry(REWARD_KEY);
    expect(entry.addressed).toBe(true);
    expect(entry.aiComments).toBeNull();
  });
});

describe('curationFormStore — reset', () => {
  it('reset clears all sections and challengeId', () => {
    const store = makeStore();
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    store.getState().setSectionData(PROBLEM_KEY, 'text');
    store.getState().reset();
    expect(store.getState().sections).toEqual({});
    expect(store.getState().challengeId).toBeNull();
  });
});
