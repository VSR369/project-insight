/**
 * amendmentScopeService.test — Phase 9 v4 — Prompt 4 done-criteria.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeScope,
  normalizeScopes,
  resolveSignatoryMatrix,
  resolveAmendmentRoutingEvents,
  shouldRequireSolverReacceptance,
  isMaterialAmendment,
} from '../amendmentScopeService';

describe('normalizeScope', () => {
  it('maps known aliases (case-insensitive)', () => {
    expect(normalizeScope('legal_terms')).toBe('LEGAL');
    expect(normalizeScope(' Legal Terms ')).toBe('LEGAL');
    expect(normalizeScope('PRICING')).toBe('FINANCIAL');
    expect(normalizeScope('typo')).toBe('EDITORIAL');
    expect(normalizeScope('deliverables')).toBe('SCOPE_CHANGE');
    expect(normalizeScope('governance_escalation')).toBe('GOVERNANCE_CHANGE');
  });

  it('falls back to OTHER for unknown / empty / null', () => {
    expect(normalizeScope(null)).toBe('OTHER');
    expect(normalizeScope(undefined)).toBe('OTHER');
    expect(normalizeScope('')).toBe('OTHER');
    expect(normalizeScope('something_else')).toBe('OTHER');
  });
});

describe('normalizeScopes', () => {
  it('dedupes after normalization and orders canonically', () => {
    const r = normalizeScopes(['Pricing', 'finance', 'legal', 'LEGAL']);
    expect(r).toEqual(['LEGAL', 'FINANCIAL']);
  });

  it('returns empty array for empty input', () => {
    expect(normalizeScopes([])).toEqual([]);
  });
});

describe('resolveSignatoryMatrix', () => {
  it('LEGAL → LC + CR + SP', () => {
    expect(resolveSignatoryMatrix(['LEGAL'])).toEqual(['LC', 'CR', 'SP']);
  });

  it('FINANCIAL → FC + CR', () => {
    expect(resolveSignatoryMatrix(['FINANCIAL'])).toEqual(['FC', 'CR']);
  });

  it('GOVERNANCE_CHANGE → LC + FC + CR', () => {
    expect(resolveSignatoryMatrix(['GOVERNANCE_CHANGE'])).toEqual(['LC', 'FC', 'CR']);
  });

  it('EDITORIAL → no signatories', () => {
    expect(resolveSignatoryMatrix(['EDITORIAL'])).toEqual([]);
  });

  it('combines and dedupes across multiple scopes', () => {
    const r = resolveSignatoryMatrix(['LEGAL', 'FINANCIAL']);
    expect(r).toEqual(['LC', 'FC', 'CR', 'SP']);
  });
});

describe('resolveAmendmentRoutingEvents', () => {
  it('emits LEGAL routing for LEGAL scope', () => {
    expect(resolveAmendmentRoutingEvents(['LEGAL'])).toContain('AMENDMENT_APPROVED_LEGAL');
  });

  it('emits FINANCIAL routing for either FINANCIAL or ESCROW', () => {
    expect(resolveAmendmentRoutingEvents(['FINANCIAL'])).toContain('AMENDMENT_APPROVED_FINANCIAL');
    expect(resolveAmendmentRoutingEvents(['ESCROW'])).toContain('AMENDMENT_APPROVED_FINANCIAL');
  });

  it('emits GOVERNANCE_ESCALATION routing for GOVERNANCE_CHANGE', () => {
    expect(resolveAmendmentRoutingEvents(['GOVERNANCE_CHANGE'])).toEqual([
      'AMENDMENT_APPROVED_GOVERNANCE_ESCALATION',
    ]);
  });

  it('emits no events for EDITORIAL or OTHER', () => {
    expect(resolveAmendmentRoutingEvents(['EDITORIAL'])).toEqual([]);
    expect(resolveAmendmentRoutingEvents(['OTHER'])).toEqual([]);
  });
});

describe('shouldRequireSolverReacceptance', () => {
  it('true for LEGAL or SCOPE_CHANGE', () => {
    expect(shouldRequireSolverReacceptance(['LEGAL'])).toBe(true);
    expect(shouldRequireSolverReacceptance(['SCOPE_CHANGE'])).toBe(true);
  });

  it('false for FINANCIAL/ESCROW/EDITORIAL/OTHER alone', () => {
    expect(shouldRequireSolverReacceptance(['FINANCIAL'])).toBe(false);
    expect(shouldRequireSolverReacceptance(['ESCROW'])).toBe(false);
    expect(shouldRequireSolverReacceptance(['EDITORIAL'])).toBe(false);
  });
});

describe('isMaterialAmendment', () => {
  it('material for LEGAL / SCOPE_CHANGE / FINANCIAL / GOVERNANCE_CHANGE', () => {
    expect(isMaterialAmendment(['LEGAL'])).toBe(true);
    expect(isMaterialAmendment(['SCOPE_CHANGE'])).toBe(true);
    expect(isMaterialAmendment(['FINANCIAL'])).toBe(true);
    expect(isMaterialAmendment(['GOVERNANCE_CHANGE'])).toBe(true);
  });

  it('non-material for EDITORIAL / OTHER alone', () => {
    expect(isMaterialAmendment(['EDITORIAL'])).toBe(false);
    expect(isMaterialAmendment(['OTHER'])).toBe(false);
  });
});
