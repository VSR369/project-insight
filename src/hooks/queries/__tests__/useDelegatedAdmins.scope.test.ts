/**
 * Phase 10e — Tests for delegated-admin scope helpers.
 *
 * `checkScopeOverlap` and `detectScopeNarrowing` are pure functions but live
 * in a hooks module that imports the Supabase client. We mock the client so
 * the test stays a pure unit test (no network, no env dependency).
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getUser: vi.fn() },
  },
}));
vi.mock('@/lib/auditFields', () => ({
  withCreatedBy: async (x: unknown) => x,
  withUpdatedBy: async (x: unknown) => x,
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('@/lib/errorHandler', () => ({
  handleMutationError: vi.fn(),
  logWarning: vi.fn(),
}));

import {
  checkScopeOverlap,
  detectScopeNarrowing,
  EMPTY_SCOPE,
  type DelegatedAdmin,
  type DomainScope,
} from '@/hooks/queries/useDelegatedAdmins';

const baseScope = (overrides: Partial<DomainScope> = {}): DomainScope => ({
  ...EMPTY_SCOPE,
  ...overrides,
});

const admin = (over: Partial<DelegatedAdmin>): DelegatedAdmin => ({
  id: 'a1',
  organization_id: 'org1',
  user_id: null,
  admin_tier: 'DELEGATED',
  status: 'active',
  full_name: 'A One',
  email: 'a1@x.com',
  phone: null,
  title: null,
  domain_scope: EMPTY_SCOPE,
  designation_method: null,
  activated_at: null,
  created_at: '2026-01-01T00:00:00Z',
  ...over,
});

describe('checkScopeOverlap', () => {
  it('returns empty when no existing admins', () => {
    expect(checkScopeOverlap(baseScope({ industry_segment_ids: ['i1'] }), [])).toEqual([]);
  });

  it('flags an admin whose industry intersects', () => {
    const existing = [admin({ domain_scope: baseScope({ industry_segment_ids: ['i1', 'i2'] }) })];
    const result = checkScopeOverlap(baseScope({ industry_segment_ids: ['i2'] }), existing);
    expect(result).toEqual([{ name: 'A One', email: 'a1@x.com' }]);
  });

  it('does not flag deactivated admins even if industry matches', () => {
    const existing = [
      admin({
        status: 'deactivated',
        domain_scope: baseScope({ industry_segment_ids: ['i1'] }),
      }),
    ];
    expect(checkScopeOverlap(baseScope({ industry_segment_ids: ['i1'] }), existing)).toEqual([]);
  });

  it('excludes the admin id passed in (edit context)', () => {
    const existing = [
      admin({ id: 'self', domain_scope: baseScope({ industry_segment_ids: ['i1'] }) }),
      admin({ id: 'other', email: 'other@x.com', full_name: 'Other', domain_scope: baseScope({ industry_segment_ids: ['i1'] }) }),
    ];
    const result = checkScopeOverlap(
      baseScope({ industry_segment_ids: ['i1'] }),
      existing,
      'self',
    );
    expect(result.map((a) => a.email)).toEqual(['other@x.com']);
  });

  it('returns empty when industries do not intersect (other dimensions ignored)', () => {
    const existing = [
      admin({
        domain_scope: baseScope({
          industry_segment_ids: ['iX'],
          department_ids: ['d1'],
        }),
      }),
    ];
    const result = checkScopeOverlap(
      baseScope({ industry_segment_ids: ['iY'], department_ids: ['d1'] }),
      existing,
    );
    expect(result).toEqual([]);
  });

  it('falls back to EMPTY_SCOPE when admin.domain_scope is null/undefined', () => {
    const existing = [admin({ domain_scope: null as unknown as DomainScope })];
    expect(
      checkScopeOverlap(baseScope({ industry_segment_ids: ['i1'] }), existing),
    ).toEqual([]);
  });

  it('handles defensively-empty input scope', () => {
    const existing = [admin({ domain_scope: baseScope({ industry_segment_ids: ['i1'] }) })];
    expect(checkScopeOverlap(EMPTY_SCOPE, existing)).toEqual([]);
  });
});

describe('detectScopeNarrowing', () => {
  it('flags removal across multiple dimensions', () => {
    const oldScope = baseScope({
      industry_segment_ids: ['i1', 'i2'],
      department_ids: ['d1'],
    });
    const newScope = baseScope({
      industry_segment_ids: ['i1'],
      department_ids: [],
    });
    expect(detectScopeNarrowing(oldScope, newScope)).toEqual({
      isNarrowed: true,
      removedCount: 2,
    });
  });

  it('returns isNarrowed=false when scope only widens', () => {
    const oldScope = baseScope({ industry_segment_ids: ['i1'] });
    const newScope = baseScope({ industry_segment_ids: ['i1', 'i2'] });
    expect(detectScopeNarrowing(oldScope, newScope)).toEqual({
      isNarrowed: false,
      removedCount: 0,
    });
  });

  it('returns isNarrowed=false on identical scopes', () => {
    const s = baseScope({ industry_segment_ids: ['i1'], department_ids: ['d1'] });
    expect(detectScopeNarrowing(s, s)).toEqual({ isNarrowed: false, removedCount: 0 });
  });
});
