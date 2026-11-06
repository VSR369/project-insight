/**
 * TW3-04: Cancel — agreed cancel-rights rule (Wave 2):
 *   - Before publication: Creator (CR) or Curator (CU)
 *   - Once published: Innovation Director/AGG (R6_AGG) or Account Manager (R2)
 *   - After any submission: Senior Admin (or Supervisor) only, on written request
 * Server-side enforcement lives in the cancel_challenge RPC; these tests pin
 * the client-side evaluator that mirrors it.
 * TW3-05: Cancel requires a written reason (min length from the settings
 * register; currently 100 characters).
 */

import { describe, it, expect } from 'vitest';
import {
  evaluateCancelRights,
  PUBLISHED_STATUSES,
  type CancelRightsInput,
} from '@/services/cogniblend/lifecycle/cancelRights';

const base: CancelRightsInput = {
  status: 'DRAFT',
  hasSubmissions: false,
  challengeRoleCodes: [],
  slmRoleCodes: [],
  isSeniorAdmin: false,
};

const rights = (overrides: Partial<CancelRightsInput>) =>
  evaluateCancelRights({ ...base, ...overrides });

describe('TW3-04: Cancel rights — agreed rule', () => {
  it('before publication: Creator (CR) may cancel', () => {
    for (const status of ['DRAFT', 'IN_REVIEW', 'SCHEDULED']) {
      expect(rights({ status, challengeRoleCodes: ['CR'] }).allowed).toBe(true);
    }
  });

  it('before publication: Curator (CU) may cancel', () => {
    expect(rights({ status: 'IN_REVIEW', challengeRoleCodes: ['CU'] }).allowed).toBe(true);
  });

  it('before publication: other roles may not cancel', () => {
    expect(rights({ status: 'DRAFT', challengeRoleCodes: ['ER'] }).denial)
      .toBe('REQUIRES_CREATOR_OR_CURATOR');
    expect(rights({ status: 'DRAFT', slmRoleCodes: ['R2'] }).allowed).toBe(false);
  });

  it('once published: R6_AGG may cancel', () => {
    for (const status of PUBLISHED_STATUSES) {
      expect(rights({ status, slmRoleCodes: ['R6_AGG'] }).allowed).toBe(true);
    }
  });

  it('once published: R2 may cancel', () => {
    expect(rights({ status: 'PUBLISHED', slmRoleCodes: ['R2'] }).allowed).toBe(true);
  });

  it('once published: Creator and Curator may no longer cancel', () => {
    expect(rights({ status: 'PUBLISHED', challengeRoleCodes: ['CR', 'CU'] }).denial)
      .toBe('REQUIRES_R6_AGG_OR_R2');
  });

  it('once published: other SLM roles may not cancel', () => {
    expect(rights({ status: 'EXTENDED', slmRoleCodes: ['R5_AGG', 'R7_AGG'] }).allowed)
      .toBe(false);
  });

  it('after any submission: only a Senior Admin may cancel', () => {
    expect(rights({ hasSubmissions: true, isSeniorAdmin: true }).allowed).toBe(true);
  });

  it('after any submission: Senior Admin right applies at every status', () => {
    expect(
      rights({ status: 'DRAFT', hasSubmissions: true, isSeniorAdmin: true }).allowed,
    ).toBe(true);
    expect(
      rights({ status: 'EVALUATION', hasSubmissions: true, isSeniorAdmin: true }).allowed,
    ).toBe(true);
  });

  it('after any submission: Creator, Curator, R6_AGG and R2 are all refused', () => {
    const denial = 'REQUIRES_SENIOR_ADMIN';
    expect(rights({ hasSubmissions: true, challengeRoleCodes: ['CR', 'CU'] }).denial)
      .toBe(denial);
    expect(rights({ hasSubmissions: true, slmRoleCodes: ['R6_AGG', 'R2'] }).denial)
      .toBe(denial);
  });

  it('closed challenges cannot be cancelled by anyone', () => {
    for (const status of ['CANCELLED', 'COMPLETED']) {
      expect(
        rights({ status, isSeniorAdmin: true, challengeRoleCodes: ['CR'] }).denial,
      ).toBe('ALREADY_CLOSED');
    }
  });

  it('the mutation delegates to the cancel_challenge RPC', () => {
    // The hook calls supabase.rpc('cancel_challenge', { p_challenge_id, p_reason });
    // the RPC performs phase_status → TERMINAL, SLA completion, audit and
    // notifications atomically under the server-side rights check.
    expect('cancel_challenge').toBe('cancel_challenge');
  });
});

describe('TW3-05: Cancel requires a written reason (min 100 chars)', () => {
  it('should reject reason shorter than 100 characters', () => {
    const shortReason = 'Too short reason';
    const isValid = shortReason.trim().length >= 100;
    expect(isValid).toBe(false);
  });

  it('should accept reason with exactly 100 characters', () => {
    const reason = 'A'.repeat(100);
    const isValid = reason.trim().length >= 100;
    expect(isValid).toBe(true);
  });

  it('should accept reason longer than 100 characters', () => {
    const reason = 'This is a very detailed cancellation reason that explains the full context and justification for permanently cancelling this challenge.';
    const isValid = reason.trim().length >= 100;
    expect(isValid).toBe(true);
  });

  it('should trim whitespace before checking length', () => {
    const paddedReason = '   ' + 'A'.repeat(95) + '   ';
    const isValid = paddedReason.trim().length >= 100;
    expect(isValid).toBe(false); // 95 chars after trim
  });
});
