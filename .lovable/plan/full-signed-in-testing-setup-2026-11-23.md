# Full signed-in testing setup

1. **Repair secret handling**
   - Generate one project secret per required test account.
   - Remove hard-coded passwords and credential responses from all six seed/setup tools and shared test data.
   - Return only email addresses, roles, and non-secret setup evidence.

2. **Repair the six existing tools**
   - Make organisation and user setup idempotent.
   - Replace invalid direct lifecycle/status writes with the current server-controlled steps.
   - Align organisation plans, role assignments, provider certification, reviewer approval, and legal gates with current rules.
   - Deploy and execute each repaired tool, then resolve runtime failures.

3. **Create the signed-in test environment**
   - Create one Aggregator and one Marketplace organisation on Standard or higher plans.
   - Create 14 accounts: Platform Admin, Senior Admin, Supervisor, Primary Seeking Organisation Admin, Delegated Admin, Creator (R4), Curator, Legal Coordinator, Finance Coordinator, Expert Reviewer, R6_AGG decision-maker, R2 Marketplace decision-maker, certified Solution Provider, and Panel Reviewer.
   - Confirm every account can authenticate through the normal sign-in flow.

4. **Enable and run the 69 integration tests**
   - Point provider lifecycle/assessment tests at the certified provider’s project secret.
   - Supply the required administrator/reviewer credentials to reviewer tests without exposing values.
   - Run all three integration suites and report exact pass/fail counts and failure reasons.

5. **Verify every role in the browser**
   - Sign in through the normal page as each of the 14 users.
   - Confirm the expected landing page and visible role context for each account.
   - Run the existing smoke suite and check the build.

6. **Stop and report**
   - Provide the test email/role list, organisation details, integration results, browser landing-page matrix, database/access/data changes, and any remaining failure with its reason.

## Technical notes

- Use shared secret-resolution helpers inside `supabase/functions/_shared/`; never write secret values to source, logs, responses, reports, or chat.
- Keep changes limited to the six named tools, their shared test helpers, and the three integration-test authentication helpers.
- Do not change production business rules, settings, governance names, or lifecycle behavior to make tests pass.
