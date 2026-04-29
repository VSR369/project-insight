/**
 * Phase 10e — FSM legality + activation-authority unit tests.
 *
 * Mirrors the DB trigger `enforce_enterprise_agreement_fsm`. Any change in
 * either side should fail one of these tests.
 */

import { describe, it, expect } from 'vitest';
import {
  LEGAL_TRANSITIONS,
  canTransition,
  requiresPlatformAuthority,
  isTerminalStatus,
  type EnterpriseAgreementStatus,
} from '@/services/enterprise/enterpriseAgreementFsm';

const ALL_STATUSES: EnterpriseAgreementStatus[] = [
  'draft',
  'pending_signature',
  'signed',
  'active',
  'expired',
  'terminated',
  'superseded',
];

describe('enterpriseAgreementFsm.canTransition — legal edges', () => {
  it.each([
    ['draft', 'pending_signature'],
    ['draft', 'terminated'],
    ['pending_signature', 'signed'],
    ['pending_signature', 'draft'],
    ['pending_signature', 'terminated'],
    ['signed', 'active'],
    ['signed', 'terminated'],
    ['active', 'expired'],
    ['active', 'terminated'],
    ['active', 'superseded'],
  ] as const)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });
});

describe('enterpriseAgreementFsm.canTransition — illegal edges', () => {
  it.each([
    ['draft', 'signed'],
    ['draft', 'active'],
    ['pending_signature', 'active'],
    ['signed', 'draft'],
    ['signed', 'pending_signature'],
    ['active', 'draft'],
    ['active', 'signed'],
    ['expired', 'active'],
    ['terminated', 'draft'],
    ['superseded', 'active'],
  ] as const)('blocks %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  it('blocks self-transitions for every status', () => {
    for (const s of ALL_STATUSES) {
      expect(canTransition(s, s)).toBe(false);
    }
  });
});

describe('enterpriseAgreementFsm.requiresPlatformAuthority', () => {
  it('flags only signed → active as platform-only (Option A)', () => {
    expect(requiresPlatformAuthority('signed', 'active')).toBe(true);
  });

  it('does not flag any other legal edge as platform-only', () => {
    for (const from of ALL_STATUSES) {
      for (const to of LEGAL_TRANSITIONS[from]) {
        if (from === 'signed' && to === 'active') continue;
        expect(requiresPlatformAuthority(from, to)).toBe(false);
      }
    }
  });
});

describe('enterpriseAgreementFsm.isTerminalStatus', () => {
  it('treats expired / terminated / superseded as terminal', () => {
    expect(isTerminalStatus('expired')).toBe(true);
    expect(isTerminalStatus('terminated')).toBe(true);
    expect(isTerminalStatus('superseded')).toBe(true);
  });

  it('treats every active-lifecycle status as non-terminal', () => {
    expect(isTerminalStatus('draft')).toBe(false);
    expect(isTerminalStatus('pending_signature')).toBe(false);
    expect(isTerminalStatus('signed')).toBe(false);
    expect(isTerminalStatus('active')).toBe(false);
  });
});

describe('LEGAL_TRANSITIONS — structural invariants', () => {
  it('lists every status as a key', () => {
    for (const s of ALL_STATUSES) {
      expect(LEGAL_TRANSITIONS).toHaveProperty(s);
    }
  });

  it('never references an unknown target status', () => {
    for (const targets of Object.values(LEGAL_TRANSITIONS)) {
      for (const t of targets) {
        expect(ALL_STATUSES).toContain(t);
      }
    }
  });

  it('contains no self-loops', () => {
    for (const [from, targets] of Object.entries(LEGAL_TRANSITIONS)) {
      expect(targets).not.toContain(from);
    }
  });
});
