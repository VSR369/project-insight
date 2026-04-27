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
  it('LEGAL → LC + FC + CR + SP (FC re-signs because CPA version is shared)', () => {
    expect(resolveSignatoryMatrix(['LEGAL'])).toEqual(['LC', 'FC', 'CR', 'SP']);
  });

  it('FINANCIAL → LC + FC + CR + SP (LC re-signs stale CPA; SP material change)', () => {
    expect(resolveSignatoryMatrix(['FINANCIAL'])).toEqual(['LC', 'FC', 'CR', 'SP']);
  });

  it('ESCROW → LC + FC + CR + SP (escrow clauses are version-bound to the same CPA)', () => {
    expect(resolveSignatoryMatrix(['ESCROW'])).toEqual(['LC', 'FC', 'CR', 'SP']);
  });

  it('SCOPE_CHANGE → CR + SP (LC/FC unaffected unless paired)', () => {
    expect(resolveSignatoryMatrix(['SCOPE_CHANGE'])).toEqual(['CR', 'SP']);
  });

  it('GOVERNANCE_CHANGE → LC + FC + CR + SP (mode escalation)', () => {
    expect(resolveSignatoryMatrix(['GOVERNANCE_CHANGE'])).toEqual(['LC', 'FC', 'CR', 'SP']);
  });

  it('EDITORIAL → no signatories', () => {
    expect(resolveSignatoryMatrix(['EDITORIAL'])).toEqual([]);
  });

  it('OTHER → CR only (conservative)', () => {
    expect(resolveSignatoryMatrix(['OTHER'])).toEqual(['CR']);
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
  it('true for every material scope (LEGAL / SCOPE_CHANGE / FINANCIAL / ESCROW / GOVERNANCE_CHANGE)', () => {
    expect(shouldRequireSolverReacceptance(['LEGAL'])).toBe(true);
    expect(shouldRequireSolverReacceptance(['SCOPE_CHANGE'])).toBe(true);
    expect(shouldRequireSolverReacceptance(['FINANCIAL'])).toBe(true);
    expect(shouldRequireSolverReacceptance(['ESCROW'])).toBe(true);
    expect(shouldRequireSolverReacceptance(['GOVERNANCE_CHANGE'])).toBe(true);
  });

  it('false for EDITORIAL / OTHER alone', () => {
    expect(shouldRequireSolverReacceptance(['EDITORIAL'])).toBe(false);
    expect(shouldRequireSolverReacceptance(['OTHER'])).toBe(false);
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
