import { describe, it, expect } from 'vitest';
import { getAwardActions, validateReturnReason } from '../awardActions';

const base = { recommendedBy: 'u1', confirmedBy: null, userId: 'u2' };

describe('award actions', () => {
  it('recommender cannot confirm their own recommendation', () => {
    const a = getAwardActions({ ...base, status: 'PROPOSED', userId: 'u1' });
    expect(a.canConfirm).toBe(false);
    expect(a.canReturn).toBe(false);
  });
  it('a different person can confirm or return', () => {
    const a = getAwardActions({ ...base, status: 'PROPOSED' });
    expect(a.canConfirm).toBe(true);
    expect(a.canReturn).toBe(true);
  });
  it('countersign must be a third person', () => {
    expect(getAwardActions({ ...base, status: 'AWAITING_COUNTERSIGN', confirmedBy: 'u2' }).canCountersign).toBe(false);
    expect(getAwardActions({ ...base, status: 'AWAITING_COUNTERSIGN', confirmedBy: 'u2', userId: 'u3' }).canCountersign).toBe(true);
  });
  it('new recommendation allowed only when none or returned', () => {
    expect(getAwardActions({ ...base, status: null }).canRecommend).toBe(true);
    expect(getAwardActions({ ...base, status: 'RETURNED' }).canRecommend).toBe(true);
    expect(getAwardActions({ ...base, status: 'CONFIRMED' }).canRecommend).toBe(false);
  });
  it('return needs a reason of 10+ characters', () => {
    expect(validateReturnReason('too short')).not.toBeNull();
    expect(validateReturnReason('Scores do not match the panel notes')).toBeNull();
  });
});
