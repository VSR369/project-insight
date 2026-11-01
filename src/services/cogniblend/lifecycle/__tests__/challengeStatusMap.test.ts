import { describe, it, expect } from 'vitest';
import {
  statusForPhase, isChallengeTransitionAllowed, awardActorRoles,
  resolveConfirmation, canCompleteAwarded, canCountersign, notAllowedMessage,
} from '../challengeStatusMap';

describe('DEF-0030 phase–status map', () => {
  it.each([
    [1, 'DRAFT'], [2, 'IN_REVIEW'], [3, 'IN_REVIEW'], [4, 'PUBLISHED'], [5, 'PUBLISHED'],
    [6, 'ABSTRACT_REVIEW'], [7, 'PUBLISHED'], [8, 'EVALUATION'], [9, 'EVALUATION'], [10, 'AWARDED'],
  ])('phase %i → %s', (phase, status) => {
    expect(statusForPhase(phase)).toBe(status);
  });
});

describe('DEF-0008 ST-24 transitions', () => {
  it('allows No award: Evaluation → Completed', () => {
    expect(isChallengeTransitionAllowed('EVALUATION', 'COMPLETED')).toBe(true);
  });
  it('refuses skipping Published → Awarded', () => {
    expect(isChallengeTransitionAllowed('PUBLISHED', 'AWARDED')).toBe(false);
  });
  it('refuses cancelling a Completed challenge', () => {
    expect(isChallengeTransitionAllowed('COMPLETED', 'CANCELLED')).toBe(false);
  });
  it('uses the agreed refusal wording', () => {
    expect(notAllowedMessage('AWARDED')).toBe('You are not allowed to move this challenge to Awarded.');
  });
});

describe('DEF-0145 award step owners', () => {
  it('Aggregator Express: Creator recommends, R6_AGG confirms', () => {
    expect(awardActorRoles('AGG', 'QUICK')).toEqual({ recommenderRoles: ['CR', 'R4'], confirmerRoles: ['R6_AGG'] });
  });
  it('Marketplace: R6_MP recommends, Account Manager R2 confirms', () => {
    expect(awardActorRoles('MP', 'STRUCTURED')).toEqual({ recommenderRoles: ['R6_MP'], confirmerRoles: ['R2'] });
  });
  it('Creator without R6_AGG cannot confirm', () => {
    const r = resolveConfirmation({ confirmerId: 'a', recommenderId: 'a', confirmerHeldRoles: ['CR'], requiredConfirmerRoles: ['R6_AGG'] });
    expect(r).toEqual({ ok: false, reason: 'NOT_CONFIRMER' });
  });
  it('different R6_AGG holder confirms → Confirmed', () => {
    const r = resolveConfirmation({ confirmerId: 'b', recommenderId: 'a', confirmerHeldRoles: ['R6_AGG'], requiredConfirmerRoles: ['R6_AGG'] });
    expect(r).toEqual({ ok: true, nextStatus: 'CONFIRMED' });
  });
  it('same person holding both roles → Awaiting Platform countersign', () => {
    const r = resolveConfirmation({ confirmerId: 'a', recommenderId: 'a', confirmerHeldRoles: ['CR', 'R6_AGG'], requiredConfirmerRoles: ['R6_AGG'] });
    expect(r).toEqual({ ok: true, nextStatus: 'AWAITING_COUNTERSIGN' });
  });
  it('only Senior Admin or Supervisor countersigns', () => {
    expect(canCountersign('senior_admin')).toBe(true);
    expect(canCountersign('supervisor')).toBe(true);
    expect(canCountersign('admin')).toBe(false);
  });
});

describe('Awarded → Completed', () => {
  it('needs every line Paid (Simulated) or Not Awarded', () => {
    expect(canCompleteAwarded(['PAID_SIMULATED', 'NOT_AWARDED'], false)).toBe(true);
    expect(canCompleteAwarded(['PAID_SIMULATED', 'ACCEPTED'], false)).toBe(false);
  });
  it('is blocked while a dispute is open', () => {
    expect(canCompleteAwarded(['PAID_SIMULATED'], true)).toBe(false);
  });
});
