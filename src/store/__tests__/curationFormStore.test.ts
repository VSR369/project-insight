/**
 * curationFormStore — unit tests
 *
 * Covers verification matrix items:
 * - Null-guard on accept (no crash from double-click)
 * - Accept deep merges suggestion into data
 * - Reject clears AI state
 * - Hydrate migrates legacy items
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createCurationFormStore } from '@/store/curationFormStore';
import type { SectionKey } from '@/types/sections';

const TEST_CHALLENGE_ID = 'test-challenge-123';
const REWARD_KEY = 'reward_structure' as SectionKey;

function makeStore() {
  return createCurationFormStore(TEST_CHALLENGE_ID);
}

describe('curationFormStore', () => {
  let store: ReturnType<typeof makeStore>;

  beforeEach(() => {
    store = makeStore();
  });

  it('initializes with empty sections', () => {
    expect(store.getState().sections).toEqual({});
  });

  it('setSectionData stores data for a key', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    expect(entry.data).toEqual({ rewardType: 'monetary' });
  });

  // ── Null-guard: accept with no suggestion is a no-op ──
  it('acceptAiSuggestion is a no-op when aiSuggestion is null', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    // No AI review set — aiSuggestion is null
    store.getState().acceptAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    // Data unchanged, no crash
    expect(entry.data).toEqual({ rewardType: 'monetary' });
    expect(entry.addressed).toBe(false);
  });

  it('acceptAiSuggestion is a no-op when reviewStatus is not reviewed', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    // Set review status to pending (not reviewed)
    store.getState().setReviewStatus(REWARD_KEY, 'pending');
    store.getState().acceptAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    expect(entry.data).toEqual({ rewardType: 'monetary' });
  });

  // ── Accept deep merges correctly ──
  it('acceptAiSuggestion deep merges suggestion into data', () => {
    const initialData = {
      rewardType: 'both',
      monetary: { platinum: { enabled: true, amount: 5000 } },
      nonMonetary: {
        items: [
          { id: '1', label: 'Mentorship', description: 'Sessions' },
        ],
      },
    };

    store.getState().setSectionData(REWARD_KEY, initialData);
    store.getState().setAiReview(REWARD_KEY, ['Increase platinum'], {
      monetary: { platinum: { amount: 7500 } },
    });

    store.getState().acceptAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);
    const data = entry.data as Record<string, any>;

    // Monetary updated
    expect(data.monetary.platinum.amount).toBe(7500);
    expect(data.monetary.platinum.enabled).toBe(true); // preserved
    // Non-monetary preserved
    expect(data.nonMonetary.items).toHaveLength(1);
    expect(data.nonMonetary.items[0].label).toBe('Mentorship');
    // AI state cleared
    expect(entry.aiComments).toBeNull();
    expect(entry.aiSuggestion).toBeNull();
    expect(entry.addressed).toBe(true);
  });

  // ── Reject clears AI state ──
  it('rejectAiSuggestion clears comments, suggestion, sets idle', () => {
    store.getState().setSectionData(REWARD_KEY, { rewardType: 'monetary' });
    store.getState().setAiReview(REWARD_KEY, ['Fix amount'], { monetary: {} });

    store.getState().rejectAiSuggestion(REWARD_KEY);
    const entry = store.getState().getSectionEntry(REWARD_KEY);

    expect(entry.aiComments).toBeNull();
    expect(entry.aiSuggestion).toBeNull();
    expect(entry.reviewStatus).toBe('idle');
    expect(entry.addressed).toBe(false);
  });

  // ── Hydrate migrates legacy data ──
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

    const entry = store.getState().getSectionEntry(REWARD_KEY);
    const data = entry.data as Record<string, any>;
    expect(data.nonMonetary.items[0].id).toBeDefined();
    expect(typeof data.nonMonetary.items[0].id).toBe('string');
    expect(data.nonMonetary.items[1].id).toBe('existing');
  });

  it('hydrate preserves existing review state', () => {
    store.getState().setSectionData(REWARD_KEY, { old: true });
    store.getState().setAiReview(REWARD_KEY, ['Comment'], null);

    store.getState().hydrate({
      [REWARD_KEY]: { new: true } as any,
    });

    const entry = store.getState().getSectionEntry(REWARD_KEY);
    expect(entry.data).toEqual({ new: true });
    // Review state preserved — aiComments from setAiReview still there
    expect(entry.aiComments).toEqual(['Comment']);
  });

  // ── selectIsAnyReviewPending ──
  it('selectIsAnyReviewPending detects pending reviews', () => {
    const { selectIsAnyReviewPending } = require('@/store/curationFormStore');
    store.getState().setReviewStatus(REWARD_KEY, 'pending');
    expect(selectIsAnyReviewPending(store.getState())).toBe(true);

    store.getState().setReviewStatus(REWARD_KEY, 'reviewed');
    expect(selectIsAnyReviewPending(store.getState())).toBe(false);
  });
});
