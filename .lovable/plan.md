
Goal

Make `setup-test-scenario` rerunnable and fully aligned with Legal V2 so the demo seed works reliably across all 6 governance × engagement combinations.

5-why analysis

1. Why is “Seed Demo Scenario” failing?
   - The edge function returns HTTP 500.

2. Why is it returning 500?
   - The org insert fails on `idx_seeker_orgs_unique_name_country`.

3. Why does that duplicate org still exist?
   - The cleanup path tries to hard-delete prior orgs, but it only clears challenge-centric tables and ignores delete errors on `seeker_organizations`, so the old active org can remain.

4. Why is that cleanup path brittle?
   - It treats the tenant root as disposable instead of reusing/resetting the existing demo org, even though many `seeker_*` tables reference it.

5. Why did this survive the legal-architecture rewrite?
   - The seeder was updated for CPA assembly, but idempotency was not redesigned for the new org-level setup, and the function also dropped some baseline demo provisioning (notably the premium subscription state the demo expects).

Implementation plan

1. Make the org step idempotent in `supabase/functions/setup-test-scenario/index.ts`
   - Resolve the country first.
   - Look up the demo org by `organization_name + hq_country_id` to match the unique index.
   - If found, reuse that `orgId` and reset/update it (`is_deleted = false`, `is_active = true`, tier/governance/meta fields).
   - Only insert a new org when no matching org exists.

2. Replace brittle org deletion with scoped reset logic
   - Keep challenge cleanup for that org.
   - Stop depending on deleting the tenant root row.
   - Explicitly clear/reseed demo-owned org rows touched by this function, especially:
     - `org_users`
     - `org_legal_document_templates`
     - `seeker_subscriptions`
     - scenario pool/member rows as needed
   - Throw on cleanup errors instead of continuing silently.

3. Restore the missing Legal V2 baseline
   - Re-ensure SPA / SKPA / PWA content in `legal_document_templates` using the actual body column (`content` in this schema).
   - Delete and recreate only the org’s 3 CPA templates:
     - `CPA_QUICK`
     - `CPA_STRUCTURED`
     - `CPA_CONTROLLED`
   - Recreate/update the org’s active Premium subscription in `seeker_subscriptions` by looking up the `premium` tier and billing cycle ids.

4. Keep the 6-challenge matrix deterministic
   - Preserve the 6 seeded challenges.
   - Keep `assemble_cpa` for all 6 challenges.
   - Preserve governance-specific behavior:
     - CONTROLLED → `DELPHI`, 3 evaluators
     - STRUCTURED → `SINGLE`, 1 evaluator
     - QUICK → `SINGLE`, 1 evaluator and publish-ready state

5. Reduce deploy-time fragility
   - Trim `setup-test-scenario/index.ts` by moving challenge definitions / cleanup constants into a `_shared` helper file so the entry file stays smaller and less likely to hit codegen/bundle timeouts again.
   - No DB schema changes are required for this fix.

Files to change

- `supabase/functions/setup-test-scenario/index.ts`
- `supabase/functions/_shared/setup-test-scenario-data.ts` (new shared constants/helper data)

Validation after implementation

1. Deploy `setup-test-scenario`.
2. Run the seed once: expect `success: true`.
3. Run it again immediately: expect `success: true` again.
4. Confirm the response/logs show:
   - org resolved or reset successfully
   - 3 CPA templates seeded
   - platform doc content updated
   - premium subscription present
   - CPA assembled for all 6 challenges
5. Confirm the duplicate-key error is gone.

Expected result

The demo seed becomes truly rerunnable, works with the new 3 platform docs + 3 CPA template architecture, and consistently exercises all 6 governance/engagement combinations.
