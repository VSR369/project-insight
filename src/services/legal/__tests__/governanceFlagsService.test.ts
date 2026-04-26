/**
 * governanceFlagsService.test — Phase 9 v4 — Prompt 2 done-criteria.
 *
 * Asserts that an explicit `lc_review_required = true` set on a STRUCTURED
 * challenge survives a UPDATE that flips the governance mode to QUICK and
 * back. This is the read-side mirror of the BIU trigger contract.
 */

import { describe, it, expect } from 'vitest';
import { resolveGovernanceFlags } from '../governanceFlagsService';

describe('resolveGovernanceFlags', () => {
  describe('default derivation from governance mode', () => {
    it('derives both flags = true when CONTROLLED and no explicit values', () => {
      const r = resolveGovernanceFlags({
        governance_profile: 'CONTROLLED',
        lc_review_required: null,
        fc_review_required: null,
      });
      expect(r).toEqual({
        lcRequired: true,
        fcRequired: true,
        effectiveMode: 'CONTROLLED',
        source: { lc: 'DERIVED_FROM_MODE', fc: 'DERIVED_FROM_MODE' },
      });
    });

    it('derives both flags = false when STRUCTURED', () => {
      const r = resolveGovernanceFlags({
        governance_profile: 'STRUCTURED',
        lc_review_required: null,
        fc_review_required: null,
      });
      expect(r.lcRequired).toBe(false);
      expect(r.fcRequired).toBe(false);
      expect(r.effectiveMode).toBe('STRUCTURED');
    });

    it('derives both flags = false when QUICK', () => {
      const r = resolveGovernanceFlags({
        governance_profile: 'QUICK',
      });
      expect(r.lcRequired).toBe(false);
      expect(r.fcRequired).toBe(false);
    });
  });

  describe('challenge-level governance override beats org profile', () => {
    it('uses governance_mode_override when present', () => {
      const r = resolveGovernanceFlags({
        governance_profile: 'STRUCTURED',
        governance_mode_override: 'CONTROLLED',
      });
      expect(r.effectiveMode).toBe('CONTROLLED');
      expect(r.lcRequired).toBe(true);
      expect(r.fcRequired).toBe(true);
    });
  });

  describe('manual override survives mode flips (Hole 2)', () => {
    it('explicit lc_review_required=true on STRUCTURED is preserved', () => {
      const r = resolveGovernanceFlags({
        governance_profile: 'STRUCTURED',
        lc_review_required: true,
        fc_review_required: null,
      });
      expect(r.lcRequired).toBe(true);
      expect(r.source.lc).toBe('EXPLICIT');
      expect(r.fcRequired).toBe(false);
      expect(r.source.fc).toBe('DERIVED_FROM_MODE');
    });

    it('explicit lc=true survives flip STRUCTURED -> QUICK -> STRUCTURED', () => {
      // Simulates the trigger contract: callers re-read the row; the explicit
      // value remains on the row, so the resolver still returns true.
      const initial = resolveGovernanceFlags({
        governance_profile: 'STRUCTURED',
        lc_review_required: true,
      });
      expect(initial.lcRequired).toBe(true);

      // Mode flipped to QUICK; explicit flag still on the row.
      const flippedQuick = resolveGovernanceFlags({
        governance_profile: 'QUICK',
        lc_review_required: true,
      });
      expect(flippedQuick.lcRequired).toBe(true);
      expect(flippedQuick.source.lc).toBe('EXPLICIT');

      // Mode flipped back to STRUCTURED; still preserved.
      const back = resolveGovernanceFlags({
        governance_profile: 'STRUCTURED',
        lc_review_required: true,
      });
      expect(back.lcRequired).toBe(true);
    });

    it('explicit fc_review_required=false on CONTROLLED is preserved', () => {
      // Curator can opt out of FC review even on a CONTROLLED challenge.
      const r = resolveGovernanceFlags({
        governance_profile: 'CONTROLLED',
        fc_review_required: false,
      });
      expect(r.fcRequired).toBe(false);
      expect(r.source.fc).toBe('EXPLICIT');
      // LC stays derived (true) because not explicitly set.
      expect(r.lcRequired).toBe(true);
      expect(r.source.lc).toBe('DERIVED_FROM_MODE');
    });
  });

  describe('camelCase input compatibility', () => {
    it('accepts camelCase mapped client objects', () => {
      const r = resolveGovernanceFlags({
        governanceProfile: 'CONTROLLED',
        lcReviewRequired: false,
        fcReviewRequired: null,
      });
      expect(r.lcRequired).toBe(false);
      expect(r.fcRequired).toBe(true);
    });
  });

  describe('null/undefined safety', () => {
    it('returns safe defaults for null input (STRUCTURED, both false)', () => {
      const r = resolveGovernanceFlags(null);
      expect(r.effectiveMode).toBe('STRUCTURED');
      expect(r.lcRequired).toBe(false);
      expect(r.fcRequired).toBe(false);
    });
  });
});
