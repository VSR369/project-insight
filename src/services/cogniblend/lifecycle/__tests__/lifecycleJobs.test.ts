import { describe, expect, it } from 'vitest';
import {
  extensionCountError,
  reviewPhaseForDeadline,
  shouldHoldForFutureStart,
  SUBMISSION_DEADLINE_PASSED_MESSAGE,
} from '../lifecycleJobs';

describe('J17 scheduled publication', () => {
  it('holds a future start and releases a due or unscheduled start', () => {
    const now = new Date('2027-01-01T10:00:00Z');
    expect(shouldHoldForFutureStart('2027-01-01T10:01:00Z', now)).toBe(true);
    expect(shouldHoldForFutureStart('2027-01-01T10:00:00Z', now)).toBe(false);
    expect(shouldHoldForFutureStart(null, now)).toBe(false);
  });
});

describe('J18 deadline closure', () => {
  it('moves a two-stage abstract deadline to Abstract review', () => {
    expect(reviewPhaseForDeadline(2, 5)).toBe(6);
  });
  it('moves one- and two-stage solution deadlines to Solution review', () => {
    expect(reviewPhaseForDeadline(1, 5)).toBe(8);
    expect(reviewPhaseForDeadline(2, 7)).toBe(8);
  });
  it('does not close a phase without a due submission deadline', () => {
    expect(reviewPhaseForDeadline(2, 6)).toBeNull();
  });
  it('uses the exact signed-off late-upload refusal', () => {
    expect(SUBMISSION_DEADLINE_PASSED_MESSAGE).toBe(
      'The submission deadline for this challenge has passed.',
    );
  });
});

describe('P35 extension limits', () => {
  it('allows two extensions and refuses a third', () => {
    expect(extensionCountError(0, 2)).toBeNull();
    expect(extensionCountError(1, 2)).toBeNull();
    expect(extensionCountError(2, 2)).toContain('maximum of 2 times');
  });
});
