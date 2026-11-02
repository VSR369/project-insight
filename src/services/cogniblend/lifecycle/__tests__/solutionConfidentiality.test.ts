/**
 * BR-SEC-019 (DEF-0060) acceptance scenarios, mirrored from
 * public.fn_can_view_solution. The database remains the authority.
 */
import { describe, expect, it } from 'vitest';
import {
  canViewSolution,
  isSubmissionFrozen,
  SUBMISSION_ACCESS_DENIED_MESSAGE,
  type SolutionAccessInput,
} from '../solutionConfidentiality';

const base: SolutionAccessInput = {
  isOwner: false,
  isPlatformAdmin: false,
  hasOpenDisputeCase: false,
  isWinner: false,
  challengeStatus: 'EVALUATION',
  isSeekerTenantMember: false,
  hasAcceptedPwa: false,
  isAssignedEvaluator: false,
  isAwardRecommenderOrConfirmer: false,
};

describe('canViewSolution (BR-SEC-019)', () => {
  it('allows the submitting provider to see their own solution', () => {
    expect(canViewSolution({ ...base, isOwner: true })).toBe(true);
  });

  it('refuses another provider, even one on the same challenge', () => {
    expect(canViewSolution({ ...base, hasAcceptedPwa: true })).toBe(false);
  });

  it('refuses an unassigned seeker user before the award', () => {
    expect(
      canViewSolution({ ...base, isSeekerTenantMember: true, hasAcceptedPwa: true }),
    ).toBe(false);
  });

  it('refuses a platform admin without a recorded dispute case', () => {
    expect(canViewSolution({ ...base, isPlatformAdmin: true })).toBe(false);
  });

  it('allows a platform admin acting on an open dispute case', () => {
    expect(
      canViewSolution({ ...base, isPlatformAdmin: true, hasOpenDisputeCase: true }),
    ).toBe(true);
  });

  it('allows an assigned evaluator who has accepted the PWA', () => {
    expect(
      canViewSolution({ ...base, hasAcceptedPwa: true, isAssignedEvaluator: true }),
    ).toBe(true);
  });

  it('refuses an assigned evaluator who has not accepted the PWA', () => {
    expect(canViewSolution({ ...base, isAssignedEvaluator: true })).toBe(false);
  });

  it('allows the award recommender/confirmer who has accepted the PWA', () => {
    expect(
      canViewSolution({ ...base, hasAcceptedPwa: true, isAwardRecommenderOrConfirmer: true }),
    ).toBe(true);
  });

  it('refuses the award recommender/confirmer without PWA acceptance', () => {
    expect(canViewSolution({ ...base, isAwardRecommenderOrConfirmer: true })).toBe(false);
  });

  it('lets the seeking org see a winning solution after the award', () => {
    expect(
      canViewSolution({
        ...base,
        isWinner: true,
        challengeStatus: 'AWARDED',
        isSeekerTenantMember: true,
      }),
    ).toBe(true);
  });

  it('keeps non-selected solutions hidden from the seeking org after the award', () => {
    expect(
      canViewSolution({
        ...base,
        isWinner: false,
        challengeStatus: 'AWARDED',
        isSeekerTenantMember: true,
      }),
    ).toBe(false);
  });

  it('keeps winners hidden from the seeking org before the award', () => {
    expect(
      canViewSolution({
        ...base,
        isWinner: true,
        challengeStatus: 'EVALUATION',
        isSeekerTenantMember: true,
      }),
    ).toBe(false);
  });

  it('uses the exact refusal message required by AC-SEC-010', () => {
    expect(SUBMISSION_ACCESS_DENIED_MESSAGE).toBe(
      'You do not have access to this submission.',
    );
  });
});

describe('isSubmissionFrozen (deadline freeze)', () => {
  const deadline = '2026-01-10T12:00:00Z';

  it('is not frozen before the deadline', () => {
    expect(isSubmissionFrozen(deadline, new Date('2026-01-10T11:59:59Z'))).toBe(false);
  });

  it('is frozen after the deadline', () => {
    expect(isSubmissionFrozen(deadline, new Date('2026-01-10T12:00:01Z'))).toBe(true);
  });

  it('is not frozen when the challenge has no deadline', () => {
    expect(isSubmissionFrozen(null, new Date('2026-06-01T00:00:00Z'))).toBe(false);
  });
});
