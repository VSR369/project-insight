/**
 * Phase 10g.1 — RLS policy contract test for `enterprise_agreements`.
 *
 * Behavioural proof of these policies lives in
 * `supabase/tests/enterprise_agreements_rls.test.sql` (run against a real
 * Postgres). This Vitest spec is the FAST CI safety net: it parses the
 * migration that defines the policies and asserts every clause we depend on
 * is still present.
 *
 * If anyone removes or weakens a policy clause in the migration, this test
 * fails immediately — long before the SQL harness gets a chance to run.
 *
 * The check is intentionally string-based against the canonical migration
 * file. Migrations are append-only in this project (a new migration could
 * theoretically alter these policies later) so when that happens, this test
 * must be updated to point at the new authoritative file.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MIGRATION_PATH = resolve(
  __dirname,
  '../../../../supabase/migrations/20260429124842_97dc94f1-0d7c-419f-854c-fb91036f210c.sql',
);

let migrationSql = '';

beforeAll(() => {
  migrationSql = readFileSync(MIGRATION_PATH, 'utf8');
});

/** Collapse whitespace so multi-line policy bodies match cleanly. */
function normalize(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

describe('enterprise_agreements RLS policy contract', () => {
  it('the canonical migration file exists and is non-empty', () => {
    expect(migrationSql.length, MIGRATION_PATH).toBeGreaterThan(0);
  });

  describe('platform-admin policy', () => {
    it('declares enterprise_agreements_platform_all FOR ALL TO authenticated', () => {
      const sql = normalize(migrationSql);
      expect(sql).toContain('CREATE POLICY "enterprise_agreements_platform_all"');
      expect(sql).toMatch(
        /CREATE POLICY "enterprise_agreements_platform_all"\s+ON public\.enterprise_agreements FOR ALL\s+TO authenticated/,
      );
    });

    it('uses platform_admin_profiles with admin_tier IN supervisor/senior_admin in USING', () => {
      const sql = normalize(migrationSql);
      expect(sql).toContain('FROM public.platform_admin_profiles pap');
      expect(sql).toContain('pap.user_id = auth.uid()');
      expect(sql).toContain(
        "pap.admin_tier IN ('supervisor','senior_admin')",
      );
    });

    it('repeats the same admin_tier guard inside WITH CHECK', () => {
      // Both USING and WITH CHECK must contain the supervisor/senior_admin guard
      const occurrences = migrationSql.match(
        /admin_tier IN \('supervisor','senior_admin'\)/g,
      );
      expect(occurrences, 'admin_tier guard should appear in BOTH USING and WITH CHECK')
        .not.toBeNull();
      expect(occurrences!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('org PRIMARY read policy', () => {
    it('declares enterprise_agreements_primary_read FOR SELECT TO authenticated', () => {
      const sql = normalize(migrationSql);
      expect(sql).toContain('CREATE POLICY "enterprise_agreements_primary_read"');
      expect(sql).toMatch(
        /CREATE POLICY "enterprise_agreements_primary_read"\s+ON public\.enterprise_agreements FOR SELECT\s+TO authenticated/,
      );
    });

    it('joins seeking_org_admins on user_id and organization_id', () => {
      const sql = normalize(migrationSql);
      expect(sql).toContain('FROM public.seeking_org_admins soa');
      expect(sql).toContain('soa.user_id = auth.uid()');
      expect(sql).toContain(
        'soa.organization_id = enterprise_agreements.organization_id',
      );
    });

    it("requires status = 'active' AND admin_tier = 'PRIMARY'", () => {
      const sql = normalize(migrationSql);
      expect(sql).toContain("soa.status = 'active'");
      expect(sql).toContain("soa.admin_tier = 'PRIMARY'");
    });
  });

  describe('absence of write policies for org admins', () => {
    it('has no FOR INSERT policy for non-platform actors on enterprise_agreements', () => {
      // Only platform admins should be able to INSERT, via the FOR ALL policy.
      const insertPolicies = migrationSql.match(
        /CREATE POLICY[^;]+ON public\.enterprise_agreements\s+FOR INSERT/g,
      );
      expect(insertPolicies, 'no dedicated INSERT policy should exist').toBeNull();
    });

    it('has no FOR UPDATE policy for non-platform actors on enterprise_agreements', () => {
      const updatePolicies = migrationSql.match(
        /CREATE POLICY[^;]+ON public\.enterprise_agreements\s+FOR UPDATE/g,
      );
      expect(updatePolicies, 'no dedicated UPDATE policy should exist').toBeNull();
    });

    it('has no FOR DELETE policy for non-platform actors on enterprise_agreements', () => {
      const deletePolicies = migrationSql.match(
        /CREATE POLICY[^;]+ON public\.enterprise_agreements\s+FOR DELETE/g,
      );
      expect(deletePolicies, 'no dedicated DELETE policy should exist').toBeNull();
    });
  });

  describe('table protection', () => {
    it('enables RLS on enterprise_agreements', () => {
      expect(migrationSql).toMatch(
        /ALTER TABLE public\.enterprise_agreements ENABLE ROW LEVEL SECURITY;/,
      );
    });
  });
});
