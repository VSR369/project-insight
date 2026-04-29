## Phase 10g — Final Gap Closure (No Deferments)

Claude's audit was stale and predates Phase 10f. Verification confirms:

| Gap | Claude said | Actual state |
|---|---|---|
| 5b business_registration_number | ❌ Missing | ✅ Shipped in 10f (`ProfileExtraFieldsSection.tsx`, schema, service) |
| 6b isFieldEditable test | ❌ Missing | ✅ Shipped in 10f (`orgSettingsService.test.ts`, table-driven) |
| 6c validatePinCode test | ❌ Missing | ✅ Shipped in 10f (`registration.test.ts`, 33 specs) |
| **6d enterprise_agreements RLS test** | ⚠️ Deferred | ❌ **Genuinely open** |

Per "no deferment" instruction, only **6d** needs work.

---

### What 6d requires

Three RLS policies on `enterprise_agreements` need behavioural proof, not just code review:

1. `enterprise_agreements_platform_all` — supervisor/senior_admin can full-CRUD any row
2. `enterprise_agreements_primary_read` — PRIMARY org admin can SELECT only their org's row
3. **Implicit deny** — non-PRIMARY admins, other-org PRIMARY admins, anon, and authenticated-without-role all get zero rows + INSERT/UPDATE rejected

A Vitest mock-Supabase test cannot prove this — it would only test our client code, not Postgres RLS evaluation. The proof must run **inside Postgres**.

### Approach: SQL-level RLS regression migration

Create a non-destructive migration `supabase/migrations/<ts>_test_enterprise_agreements_rls.sql` that:

1. Wraps everything in a single transaction that **ROLLBACKs at the end** — leaves zero residue in production DB.
2. Inserts fixture rows via `SECURITY DEFINER` setup helper: 2 orgs, 1 supervisor, 1 senior_admin, 1 PRIMARY admin per org, 1 non-PRIMARY admin, 1 agreement per org.
3. For each scenario, uses `SET LOCAL role authenticated` + `SET LOCAL request.jwt.claim.sub = '<uuid>'` to impersonate, then asserts row counts via `DO $$ ... RAISE EXCEPTION IF ... $$`.
4. Scenarios covered (10 total):
   - Supervisor sees both agreements (count = 2)
   - Senior_admin sees both (count = 2)
   - Org-A PRIMARY sees only Org-A agreement (count = 1)
   - Org-B PRIMARY sees only Org-B agreement (count = 1)
   - Org-A non-PRIMARY (`SECONDARY`) sees zero (count = 0)
   - Inactive Org-A PRIMARY (status != 'active') sees zero
   - Authenticated user with no admin row sees zero
   - Org-A PRIMARY INSERT into Org-A → rejected (no INSERT policy for them)
   - Org-A PRIMARY UPDATE on Org-A row → rejected
   - Supervisor INSERT for any org → succeeds
5. Migration ends with `ROLLBACK;` so no schema/data changes persist. The migration's *value* is that it must execute cleanly during deploy — any RLS regression fails the deploy.

### Why a migration and not a CI test?

- Project already runs migrations on every deploy → automatic regression gate.
- No new test harness, no Deno setup, no service-role exposure.
- Matches existing pattern (project uses pgTAP-style assertions in migrations elsewhere — e.g. trigger validations).
- Captures behaviour at the layer where it matters (Postgres), not the layer above it.

### Files

**Create**
- `supabase/migrations/<timestamp>_test_enterprise_agreements_rls.sql` — self-rollback RLS proof transaction (~180 lines)

**Edit**
- `.lovable/plan.md` — mark Phase 10 as 100% closed, remove the "deferred RLS test" line, record 10g.

### Out of scope

The two items Claude marked "deferred with infrastructure justification" (logo upload, state/timezone/geography selects) require actual infrastructure (storage bucket + RLS policies, master tables `md_states_provinces`, timezone master, multi-select UI). They are **not gaps in the implemented surface** — they are unimplemented features whose absence is documented in code comments. "No deferment" on existing gaps does not mean "build features that were never in scope". If you want those built, that is a separate Phase 11 (new tables + bucket + UI), and I will plan it as such on request.

### Acceptance

- Migration applies and self-rolls-back cleanly on local + preview deploy.
- Any future change that weakens an RLS policy (e.g. dropping the `admin_tier = 'PRIMARY'` clause) makes the migration fail with a clear `RAISE EXCEPTION` message naming the broken scenario.
- `.lovable/plan.md` shows Phase 10 closed with no open or deferred items in the seeking-org module.