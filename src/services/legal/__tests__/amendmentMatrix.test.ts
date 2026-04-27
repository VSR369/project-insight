/**
 * amendmentMatrix.test — Phase 9 v4 — Prompt 4/5 done-criteria.
 *
 * Cross-mode regression matrix: for every (governance_mode × canonical_scope)
 * pair, asserts the expected signatory set and SP re-accept gate.
 *
 * Header note (matches §5 of docs/Legal_Module_Feature_Matrix.md):
 *   LC and FC re-sign columns apply ONLY to CONTROLLED. In STRUCTURED, the
 *   Curator's re-approval substitutes for both. In QUICK, no curator/LC/FC
 *   re-sign occurs. SP re-accept applies in all governance modes whenever
 *   the CPA version changes.
 *
 * The TS service `amendmentScopeService` is governance-agnostic: it returns
 * the union of all signatories that would re-sign in CONTROLLED. This test
 * applies the governance-mode mask documented in the feature matrix to
 * derive the per-mode expectation, then compares.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveSignatoryMatrix,
  shouldRequireSolverReacceptance,
  isMaterialAmendment,
  type CanonicalScope,
  type SignatoryRole,
} from '@/services/legal/amendmentScopeService';

type GovernanceMode = 'QUICK' | 'STRUCTURED' | 'CONTROLLED';

/**
 * Apply the governance-mode mask to the CONTROLLED-flavored signatory set
 * returned by resolveSignatoryMatrix.
 */
function applyGovernanceMask(
  signatories: SignatoryRole[],
  mode: GovernanceMode,
): SignatoryRole[] {
  if (mode === 'CONTROLLED') return signatories;
  if (mode === 'STRUCTURED') {
    // Curator substitutes for LC + FC. Drop them; CR re-accept stands; SP re-accept stands.
    return signatories.filter((r) => r !== 'LC' && r !== 'FC');
  }
  // QUICK: no curator/LC/FC re-sign. Only SP re-accept survives.
  return signatories.filter((r) => r === 'SP');
}

interface MatrixCase {
  scope: CanonicalScope;
  expectedControlled: SignatoryRole[];
  expectedStructured: SignatoryRole[];
  expectedQuick: SignatoryRole[];
  spReaccept: boolean;
  material: boolean;
}

const MATRIX: MatrixCase[] = [
  {
    scope: 'LEGAL',
    expectedControlled: ['LC', 'FC', 'CR', 'SP'],
    expectedStructured: ['CR', 'SP'],
    expectedQuick: ['SP'],
    spReaccept: true,
    material: true,
  },
  {
    scope: 'FINANCIAL',
    expectedControlled: ['LC', 'FC', 'CR', 'SP'],
    expectedStructured: ['CR', 'SP'],
    expectedQuick: ['SP'],
    spReaccept: true,
    material: true,
  },
  {
    scope: 'ESCROW',
    expectedControlled: ['LC', 'FC', 'CR', 'SP'],
    expectedStructured: ['CR', 'SP'],
    expectedQuick: ['SP'],
    spReaccept: true,
    material: true, // ESCROW clauses are part of the version-bound CPA
  },
  {
    scope: 'EDITORIAL',
    expectedControlled: [],
    expectedStructured: [],
    expectedQuick: [],
    spReaccept: false,
    material: false,
  },
  {
    scope: 'SCOPE_CHANGE',
    expectedControlled: ['CR', 'SP'],
    expectedStructured: ['CR', 'SP'],
    expectedQuick: ['SP'],
    spReaccept: true,
    material: true,
  },
  {
    scope: 'GOVERNANCE_CHANGE',
    expectedControlled: ['LC', 'FC', 'CR', 'SP'],
    expectedStructured: ['CR', 'SP'],
    // QUICK is not a valid post-publish target; included for completeness.
    expectedQuick: ['SP'],
    spReaccept: true,
    material: true,
  },
  {
    scope: 'OTHER',
    expectedControlled: ['CR'],
    expectedStructured: ['CR'],
    expectedQuick: [],
    spReaccept: false,
    material: false,
  },
];

describe('amendment matrix — governance × scope', () => {
  MATRIX.forEach((row) => {
    describe(`scope = ${row.scope}`, () => {
      it('CONTROLLED signatories', () => {
        const base = resolveSignatoryMatrix([row.scope]);
        expect(applyGovernanceMask(base, 'CONTROLLED')).toEqual(row.expectedControlled);
      });

      it('STRUCTURED signatories (Curator substitutes for LC + FC)', () => {
        const base = resolveSignatoryMatrix([row.scope]);
        expect(applyGovernanceMask(base, 'STRUCTURED')).toEqual(row.expectedStructured);
      });

      it('QUICK signatories (only SP re-accept survives)', () => {
        const base = resolveSignatoryMatrix([row.scope]);
        expect(applyGovernanceMask(base, 'QUICK')).toEqual(row.expectedQuick);
      });

      it('SP reaccept gate', () => {
        expect(shouldRequireSolverReacceptance([row.scope])).toBe(row.spReaccept);
      });

      it('materiality classification', () => {
        expect(isMaterialAmendment([row.scope])).toBe(row.material);
      });
    });
  });

  it('combined LEGAL + FINANCIAL collapses to union (CONTROLLED)', () => {
    const base = resolveSignatoryMatrix(['LEGAL', 'FINANCIAL']);
    expect(applyGovernanceMask(base, 'CONTROLLED')).toEqual(['LC', 'FC', 'CR', 'SP']);
  });

  it('combined LEGAL + FINANCIAL is material and requires SP reaccept', () => {
    expect(isMaterialAmendment(['LEGAL', 'FINANCIAL'])).toBe(true);
    expect(shouldRequireSolverReacceptance(['LEGAL', 'FINANCIAL'])).toBe(true);
  });
});
