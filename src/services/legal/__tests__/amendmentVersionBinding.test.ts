/**
 * amendmentVersionBinding.test — Phase 9 v4 — Prompt 4 follow-up.
 *
 * Asserts the contract that on amendment approval:
 *   1. In-scope (LEGAL/SCOPE/GOVERNANCE) docs get template_version bumped.
 *   2. In-scope (FINANCIAL/ESCROW) docs get template_version bumped on those scopes.
 *   3. Out-of-scope docs (e.g. EDITORIAL only) are NOT bumped.
 *   4. Ledger rows are written one per (signatory × in-scope doc), version-pinned.
 *   5. When the resolver returns the same version, no bump and no ledger row.
 *
 * The Supabase client and `resolveActiveLegalTemplate` are mocked end-to-end so
 * this is a pure-logic test of the routing matrix in `bindAmendmentToNewTemplateVersions`.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Supabase mock ───────────────────────────────────────────
type Row = Record<string, unknown>;
const mockState: {
  legalDocs: Row[];
  roleRows: Row[];
  ledgerInserts: Row[][];
  legalDocUpdates: Array<{ id: string; patch: Row }>;
} = { legalDocs: [], roleRows: [], ledgerInserts: [], legalDocUpdates: [] };

vi.mock('@/integrations/supabase/client', () => {
  const builder = (table: string) => {
    if (table === 'challenge_legal_docs') {
      return {
        select: () => ({ eq: () => Promise.resolve({ data: mockState.legalDocs, error: null }) }),
        update: (patch: Row) => ({
          eq: (_col: string, id: string) => {
            mockState.legalDocUpdates.push({ id, patch });
            return Promise.resolve({ error: null });
          },
        }),
      };
    }
    if (table === 'user_challenge_roles') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: () => Promise.resolve({ data: mockState.roleRows, error: null }),
            }),
          }),
        }),
      };
    }
    if (table === 'legal_acceptance_ledger') {
      return {
        insert: (rows: Row[]) => {
          mockState.ledgerInserts.push(rows);
          return Promise.resolve({ error: null });
        },
      };
    }
    return {};
  };
  return { supabase: { from: builder } };
});

// ─── resolver mock ───────────────────────────────────────────
vi.mock('@/services/legal/roleDocResolver', () => ({
  resolveActiveLegalTemplate: vi.fn(async (_orgId, docCode) => ({
    template_id: `tpl-${docCode}`,
    document_code: docCode,
    version: 'v2', // always returns "v2" — bumps from "v1"
    content: '',
    source: 'PLATFORM',
  })),
}));

vi.mock('@/lib/errorHandler', () => ({
  logInfo: vi.fn(),
  logWarning: vi.fn(),
}));

// ─── SUT (import after mocks) ────────────────────────────────
const { bindAmendmentToNewTemplateVersions } = await import('../amendmentVersionBinding');

beforeEach(() => {
  mockState.legalDocs = [];
  mockState.roleRows = [];
  mockState.ledgerInserts = [];
  mockState.legalDocUpdates = [];
});

describe('bindAmendmentToNewTemplateVersions', () => {
  it('bumps CPA on LEGAL scope and writes ledger rows for CU + LC', async () => {
    mockState.legalDocs = [
      { id: 'doc-cpa', document_type: 'CPA', tier: 'TIER_1', status: 'SIGNED', template_version: 'v1', document_name: 'CPA' },
    ];
    mockState.roleRows = [
      { user_id: 'user-cu', role_code: 'CU' },
      { user_id: 'user-lc', role_code: 'LC' },
      { user_id: 'user-fc', role_code: 'FC' },
    ];

    const result = await bindAmendmentToNewTemplateVersions({
      challengeId: 'c1',
      organizationId: 'org1',
      canonicalScopes: ['LEGAL'],
      newPackageVersion: 2,
      approvedBy: 'approver',
    });

    expect(result.docsBumped).toBe(1);
    expect(mockState.legalDocUpdates[0].patch.template_version).toBe('v2');
    expect(mockState.legalDocUpdates[0].patch.status).toBe('TRIGGERED');
    // Ledger: CU + LC re-sign on LEGAL (FC does NOT re-sign on legal-only)
    const flat = mockState.ledgerInserts.flat();
    expect(flat).toHaveLength(2);
    expect(flat.every((r) => r.document_version === 'v2')).toBe(true);
    expect(flat.map((r) => r.user_id).sort()).toEqual(['user-cu', 'user-lc']);
  });

  it('bumps finance docs on FINANCIAL scope and writes ledger for CU + FC', async () => {
    mockState.legalDocs = [
      { id: 'doc-fin', document_type: 'FINANCE', tier: 'TIER_1', status: 'SIGNED', template_version: 'v1', document_name: 'Finance' },
    ];
    mockState.roleRows = [
      { user_id: 'user-cu', role_code: 'CU' },
      { user_id: 'user-lc', role_code: 'LC' },
      { user_id: 'user-fc', role_code: 'FC' },
    ];

    const result = await bindAmendmentToNewTemplateVersions({
      challengeId: 'c1',
      organizationId: 'org1',
      canonicalScopes: ['FINANCIAL'],
      newPackageVersion: 2,
      approvedBy: 'approver',
    });

    expect(result.docsBumped).toBe(1);
    const flat = mockState.ledgerInserts.flat();
    expect(flat).toHaveLength(2);
    expect(flat.map((r) => r.user_id).sort()).toEqual(['user-cu', 'user-fc']);
  });

  it('does NOT bump anything on EDITORIAL-only scope', async () => {
    mockState.legalDocs = [
      { id: 'doc-cpa', document_type: 'CPA', tier: 'TIER_1', status: 'SIGNED', template_version: 'v1', document_name: 'CPA' },
    ];
    mockState.roleRows = [{ user_id: 'user-cu', role_code: 'CU' }];

    const result = await bindAmendmentToNewTemplateVersions({
      challengeId: 'c1',
      organizationId: 'org1',
      canonicalScopes: ['EDITORIAL'],
      newPackageVersion: 2,
      approvedBy: 'approver',
    });

    expect(result.docsBumped).toBe(0);
    expect(result.ledgerRowsWritten).toBe(0);
    expect(mockState.legalDocUpdates).toHaveLength(0);
    expect(mockState.ledgerInserts).toHaveLength(0);
  });

  it('writes one ledger row per (signatory × in-scope doc) on combined LEGAL+FINANCIAL', async () => {
    mockState.legalDocs = [
      { id: 'doc-cpa', document_type: 'CPA', tier: 'TIER_1', status: 'SIGNED', template_version: 'v1', document_name: 'CPA' },
      { id: 'doc-fin', document_type: 'FINANCE', tier: 'TIER_1', status: 'SIGNED', template_version: 'v1', document_name: 'Finance' },
    ];
    mockState.roleRows = [
      { user_id: 'user-cu', role_code: 'CU' },
      { user_id: 'user-lc', role_code: 'LC' },
      { user_id: 'user-fc', role_code: 'FC' },
    ];

    const result = await bindAmendmentToNewTemplateVersions({
      challengeId: 'c1',
      organizationId: 'org1',
      canonicalScopes: ['LEGAL', 'FINANCIAL'],
      newPackageVersion: 2,
      approvedBy: 'approver',
    });

    expect(result.docsBumped).toBe(2);
    // Expected: CU re-signs both (2), LC re-signs CPA only (1), FC re-signs Finance only (1) = 4
    expect(result.ledgerRowsWritten).toBe(4);
  });

  it('honors caller-provided signatoryUserIds without RPC lookup', async () => {
    mockState.legalDocs = [
      { id: 'doc-cpa', document_type: 'CPA', tier: 'TIER_1', status: 'SIGNED', template_version: 'v1', document_name: 'CPA' },
    ];
    // intentionally empty roleRows — caller-provided IDs must win
    mockState.roleRows = [];

    const result = await bindAmendmentToNewTemplateVersions({
      challengeId: 'c1',
      organizationId: 'org1',
      canonicalScopes: ['LEGAL'],
      newPackageVersion: 2,
      approvedBy: 'approver',
      signatoryUserIds: { curatorId: 'cu-explicit', lcId: 'lc-explicit', fcId: null },
    });

    expect(result.ledgerRowsWritten).toBe(2);
    const flat = mockState.ledgerInserts.flat();
    expect(flat.map((r) => r.user_id).sort()).toEqual(['cu-explicit', 'lc-explicit']);
  });
});
