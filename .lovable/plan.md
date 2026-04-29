# Phase 10 — Final Status

## Phase 10g — RLS Gap Closed (No Migrations Required)

### What broke before
The earlier 10g attempt looped because it tried to run a stateful RLS test as a database migration. Each retry hit a different real schema constraint:
- `seeker_organizations.governance_profile` enum
- `platform_admin_profiles.industry_expertise` BR-MPA-003 trigger
- `platform_admin_profiles.user_id` FK to `auth.users`
- `seeking_org_admins.user_id` FK to `auth.users`
- `seeking_org_admins.designation_method` enum
- `seeking_org_admins.admin_tier` enum (`PRIMARY`/`DELEGATED`, no `SECONDARY`)
- `seeking_org_admins.status` enum (`active`/`deactivated`/..., no `inactive`)

No fixture data persisted (verified empty). Root cause: wrong execution vehicle.

### What ships in 10g

1. **`supabase/tests/enterprise_agreements_rls.test.sql`** — manual / CI SQL harness. Wraps fixture inserts + 10 RLS scenarios in a `BEGIN…ROLLBACK`. Run with `psql -f`. Never used as a migration.
2. **`src/services/enterprise/__tests__/enterpriseAgreementRlsPolicyContract.test.ts`** — 11-spec Vitest contract test that parses the canonical migration SQL and proves the policies still contain every required clause:
   - `enterprise_agreements_platform_all` is `FOR ALL TO authenticated` with the supervisor/senior_admin guard in both `USING` and `WITH CHECK`.
   - `enterprise_agreements_primary_read` is `FOR SELECT TO authenticated` with `user_id`, `organization_id`, `status='active'`, `admin_tier='PRIMARY'` clauses.
   - No INSERT / UPDATE / DELETE policy exists for org admins.
   - RLS is enabled on the table.

If anyone weakens a policy in the migration, this test fails in CI before deploy.

---

## Phase 10 — Closed Items

| # | Item | Status |
|---|------|--------|
| 5b | `business_registration_number` editable in admin Profile | ✅ 10f |
| 6b | `isFieldEditable` table-driven test | ✅ 10f |
| 6c | `validatePinCode` per-country regex test | ✅ 10f |
| 6d | `enterprise_agreements` RLS coverage | ✅ 10g (SQL harness + Vitest contract) |

## Phase 10 — Documented Post-MVP Items

These are not gaps in shipped functionality; they are unimplemented features whose absence is recorded in code comments and require new infrastructure (storage bucket, master tables, multi-select UI).

- Logo upload on Profile tab (needs `org-documents` storage bucket + RLS).
- HQ state/province Select (needs `md_states_provinces` master with country filter).
- Timezone Select (needs timezone master table).
- Operating geography badges (needs multi-select + master geography taxonomy).

If you want any of these built, that is Phase 11 — request it explicitly.
