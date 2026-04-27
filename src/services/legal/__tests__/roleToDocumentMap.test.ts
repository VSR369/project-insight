import { describe, it, expect } from 'vitest';
import {
  getRoleDocMappings,
  getRoleDocMapping,
  deriveRequiredSignatures,
} from '../roleToDocumentMap';

describe('roleToDocumentMap — Phase 9 v4 Prompt 1', () => {
  describe('R2 (Seeker Admin) dual-doc mapping', () => {
    it('returns BOTH SKPA and RA_R2 in deterministic order', () => {
      const mappings = getRoleDocMappings('R2');
      expect(mappings).toHaveLength(2);
      expect(mappings[0].docCode).toBe('SKPA');
      expect(mappings[1].docCode).toBe('RA_R2');
    });

    it('labels both R2 docs as Seeking Organization Admin', () => {
      const mappings = getRoleDocMappings('R2');
      mappings.forEach((m) => {
        expect(m.userRoleLabel).toBe('Seeking Organization Admin');
      });
    });

    it('legacy getRoleDocMapping returns SKPA first (back-compat)', () => {
      const single = getRoleDocMapping('R2');
      expect(single?.docCode).toBe('SKPA');
    });
  });

  describe('Other workforce roles → single PWA', () => {
    const pwaRoles: Array<[string, string]> = [
      ['R3', 'Challenge Creator'],
      ['R4', 'Challenge Creator'],
      ['CR', 'Challenge Creator'],
      ['R5_MP', 'Curator'],
      ['R5_AGG', 'Curator'],
      ['CU', 'Curator'],
      ['R7_MP', 'Expert Reviewer'],
      ['R7_AGG', 'Expert Reviewer'],
      ['ER', 'Expert Reviewer'],
      ['R8', 'Finance Coordinator'],
      ['FC', 'Finance Coordinator'],
      ['R9', 'Legal Coordinator'],
      ['LC', 'Legal Coordinator'],
    ];

    it.each(pwaRoles)('%s maps to single PWA labelled "%s"', (role, label) => {
      const mappings = getRoleDocMappings(role);
      expect(mappings).toHaveLength(1);
      expect(mappings[0].docCode).toBe('PWA');
      expect(mappings[0].userRoleLabel).toBe(label);
    });
  });

  describe('Solution Provider', () => {
    it('SP maps to single SPA', () => {
      const mappings = getRoleDocMappings('SP');
      expect(mappings).toHaveLength(1);
      expect(mappings[0].docCode).toBe('SPA');
      expect(mappings[0].userRoleLabel).toBe('Solution Provider');
    });
  });

  describe('Edge cases', () => {
    it('returns empty array for empty role code', () => {
      expect(getRoleDocMappings('')).toEqual([]);
    });

    it('returns empty array for unknown role code', () => {
      expect(getRoleDocMappings('R999_UNKNOWN')).toEqual([]);
    });

    it('is case-insensitive (uppercase fallback)', () => {
      const mappings = getRoleDocMappings('r2');
      expect(mappings).toHaveLength(2);
      expect(mappings.map((m) => m.docCode)).toEqual(['SKPA', 'RA_R2']);
    });

    it('legacy getRoleDocMapping returns null for unknown', () => {
      expect(getRoleDocMapping('NOPE')).toBeNull();
    });
  });

  describe('deriveRequiredSignatures — priority + dedup', () => {
    it('orders docs as SPA > SKPA > RA_R2 > PWA', () => {
      const sigs = deriveRequiredSignatures(['CR', 'R2', 'SP']);
      expect(sigs.map((s) => s.docCode)).toEqual([
        'SPA',
        'SKPA',
        'RA_R2',
        'PWA',
      ]);
    });

    it('deduplicates PWA when user holds multiple workforce roles', () => {
      const sigs = deriveRequiredSignatures(['CU', 'ER', 'LC']);
      expect(sigs).toHaveLength(1);
      expect(sigs[0].docCode).toBe('PWA');
      // First-encountered role wins
      expect(sigs[0].roleCode).toBe('CU');
      expect(sigs[0].userRoleLabel).toBe('Curator');
    });

    it('handles duplicate role codes without duplicating signatures', () => {
      const sigs = deriveRequiredSignatures(['R2', 'R2', 'R2']);
      expect(sigs).toHaveLength(2);
      expect(sigs.map((s) => s.docCode)).toEqual(['SKPA', 'RA_R2']);
    });

    it('returns empty array for empty input', () => {
      expect(deriveRequiredSignatures([])).toEqual([]);
    });

    it('skips unknown roles silently', () => {
      const sigs = deriveRequiredSignatures(['R2', 'UNKNOWN_ROLE']);
      expect(sigs).toHaveLength(2);
      expect(sigs.map((s) => s.docCode)).toEqual(['SKPA', 'RA_R2']);
    });

    it('R2 alone produces SKPA then RA_R2 (no PWA)', () => {
      const sigs = deriveRequiredSignatures(['R2']);
      expect(sigs.map((s) => s.docCode)).toEqual(['SKPA', 'RA_R2']);
    });

    it('SP + workforce role yields SPA before PWA', () => {
      const sigs = deriveRequiredSignatures(['CR', 'SP']);
      expect(sigs.map((s) => s.docCode)).toEqual(['SPA', 'PWA']);
    });
  });
});
