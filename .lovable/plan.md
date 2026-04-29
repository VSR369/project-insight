## Root Cause Analysis — Why Phase 10g Went Into a Loop

The loop was **not** an application runtime issue and not an RLS infinite-recursion issue. It was caused by using the Supabase migration tool as an ad-hoc integration-test runner with fixture data. Each retry exposed another existing table constraint.

### What actually happened

The attempted RLS proof inserted fixture rows into production schema tables (`seeker_organizations`, `platform_admin_profiles`, `seeking_org_admins`, `enterprise_agreements`) inside a migration-style SQL block. Those fixture inserts repeatedly failed because the current schema has legitimate constraints/triggers:

1. `seeker_organizations.governance_profile` must be one of `QUICK`, `STRUCTURED`, `CONTROLLED`.
2. `platform_admin_profiles.industry_expertise` must contain at least one industry UUID.
3. `platform_admin_profiles.user_id` has a foreign key to `auth.users`.
4. `seeking_org_admins.user_id` also has a foreign key to `auth.users`.
5. `seeking_org_admins.designation_method` must be one of `SELF`, `SEPARATE`, `DELEGATED`, `TRANSFER`.
6. `seeking_org_admins.admin_tier` must be one of `PRIMARY`, `DELEGATED` — not `SECONDARY`.
7. `seeking_org_admins.status` must be one of `pending_activation`, `active`, `suspended`, `transferred`, `deactivated` — not `inactive`.

The data was not left behind: verification shows zero Phase 10g fixture orgs, agreements, or admin rows persisted.

### Primary root cause

**Wrong execution vehicle.** A schema migration is the wrong place to run a stateful, data-dependent RLS integration test. The migration tool should be used for schema changes. The RLS test is not a schema change; it is a test harness concern.

### Secondary root cause

**Synthetic fixture assumptions were invalid.** The first plan assumed we could freely create fake admin users and rows. In this schema, admin user IDs are FK-bound to `auth.users`, and related tables have strict business-rule checks.

---

## Fix Plan — Break the Loop and Close the RLS Gap Correctly

### 1. Stop using migrations for Phase 10g test data

Do not retry the SQL migration approach. It will remain brittle because it depends on production auth users, table triggers, and business constraints.

No schema migration is needed for this gap.

### 2. Add a dedicated SQL RLS regression harness file, not a migration

Create a repo-only SQL test file, for example:

`supabase/tests/enterprise_agreements_rls.test.sql`

This file will document and execute the RLS assertions in environments where a test database/harness is available, but it will **not** run as a production migration.

It should:

- Wrap the entire test in a transaction and rollback at the end.
- Create or select fixture auth users only in a test database context.
- Insert fixture org/admin/agreement rows using schema-valid values:
  - `governance_profile = 'QUICK'`
  - `designation_method = 'SELF'`
  - non-primary admin tier = `DELEGATED`
  - inactive-equivalent status = `deactivated`
- Assert these cases:
  - supervisor sees both agreements
  - senior_admin sees both agreements
  - org A PRIMARY sees only org A
  - org B PRIMARY sees only org B
  - DELEGATED admin sees zero
  - deactivated PRIMARY sees zero
  - authenticated user without admin row sees zero
  - PRIMARY admin cannot INSERT
  - PRIMARY admin cannot UPDATE
  - supervisor can INSERT

### 3. Add a lightweight repo regression test for policy presence

Create a Vitest test that parses the enterprise migration SQL and verifies the critical policy clauses exist:

`src/services/enterprise/__tests__/enterpriseAgreementRlsPolicyContract.test.ts`

Assertions:

- `enterprise_agreements_platform_all` exists.
- Platform policy is `FOR ALL TO authenticated`.
- Platform policy requires `admin_tier IN ('supervisor','senior_admin')`.
- `enterprise_agreements_primary_read` exists.
- Primary policy is `FOR SELECT TO authenticated`.
- Primary policy includes:
  - `soa.user_id = auth.uid()`
  - `soa.organization_id = enterprise_agreements.organization_id`
  - `soa.status = 'active'`
  - `soa.admin_tier = 'PRIMARY'`
- No INSERT/UPDATE/DELETE policy exists for org PRIMARY admins.

This does not replace a real DB integration test, but it gives immediate CI coverage without mutating the database.

### 4. Update `.lovable/plan.md` accurately

Replace the current Phase 10g migration-based plan with:

- Claude's stale findings 5b/6b/6c are already fixed by Phase 10f.
- 6d is closed by:
  1. a non-production SQL RLS harness file, and
  2. a repo-level policy contract test.
- No production data mutations and no schema migrations are required.

### 5. Validation after implementation

Run the project tests after adding the Vitest policy contract test. Expected outcome:

- Existing Phase 10f tests remain passing.
- New policy-contract test passes.
- No database migration retries.
- No fixture data remains in Supabase.

---

## Why this fixes the actual loop

The loop was caused by repeatedly applying a data-mutating SQL block through the migration path. This plan removes data mutation from the deployment path entirely.

The RLS gap is still addressed, but with the correct split:

```text
Fast CI safety:      Vitest policy-contract test
True RLS proof:      SQL harness file for test DB execution
Production deploy:   no fixture data, no schema churn
```

This gives auditability without turning production migrations into a fragile test runner.