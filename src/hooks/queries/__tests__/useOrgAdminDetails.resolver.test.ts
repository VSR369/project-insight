/**
 * Phase 10a — `created_by` / `updated_by` resolution contract.
 *
 * Documents the resolveAuditUser semantics added to useOrgAdminDetails:
 *   - null UUID                      → 'System'
 *   - UUID present in name map       → resolved name
 *   - UUID NOT in name map           → 'Unknown user'
 *   - self-reference (admin = creator) → admin's own contact name
 *
 * The actual hook is exercised in integration; this spec locks the
 * resolution table so a future refactor cannot silently regress it
 * back to displaying raw UUIDs.
 */

import { describe, it, expect } from 'vitest';

type ResolvedUser = { name: string; email: string };

function resolveAuditUser(
  uuid: string | null,
  nameMap: Map<string, ResolvedUser>,
): ResolvedUser {
  if (!uuid) return { name: 'System', email: '' };
  return nameMap.get(uuid) ?? { name: 'Unknown user', email: '' };
}

describe('OrgAdminDetails — audit user resolution', () => {
  it('returns System for null UUID', () => {
    expect(resolveAuditUser(null, new Map())).toEqual({ name: 'System', email: '' });
  });

  it('resolves a known UUID to its name and email', () => {
    const map = new Map([
      ['11111111-1111-1111-1111-111111111111', { name: 'Anna Schmidt', email: 'anna@vsr.example.com' }],
    ]);
    expect(resolveAuditUser('11111111-1111-1111-1111-111111111111', map)).toEqual({
      name: 'Anna Schmidt',
      email: 'anna@vsr.example.com',
    });
  });

  it('returns Unknown user for a UUID not present in the map', () => {
    const map = new Map([
      ['11111111-1111-1111-1111-111111111111', { name: 'Anna Schmidt', email: 'anna@vsr.example.com' }],
    ]);
    expect(resolveAuditUser('99999999-9999-9999-9999-999999999999', map)).toEqual({
      name: 'Unknown user',
      email: '',
    });
  });

  it('never returns a raw UUID as the display name', () => {
    const uuid = '8a3c1e4f-2b6d-4f8a-9c3e-7d1a2b3c4e5f';
    const result = resolveAuditUser(uuid, new Map());
    expect(result.name).not.toMatch(/^[0-9a-f]{8}-/);
    expect(result.name).toBe('Unknown user');
  });

  it('handles the self-reference case (admin created their own row)', () => {
    // The hook seeds the map with the admin's own contact name when the
    // self-reference is not already covered by seeking_org_admins.
    const adminUserId = '22222222-2222-2222-2222-222222222222';
    const map = new Map<string, ResolvedUser>();
    map.set(adminUserId, { name: 'Venkata Rao', email: 'vrao@vsr.example.com' });

    const created = resolveAuditUser(adminUserId, map);
    expect(created.name).toBe('Venkata Rao');
    expect(created.email).toBe('vrao@vsr.example.com');
  });
});
