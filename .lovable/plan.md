# Full Feature Audit — Seeker Enrollment, Admin, Legal, Master Data

Goal: confirm, with evidence from the live database and the running app, that every feature built in Phases 10b–10g plus the recent fixes works end-to-end. The audit itself changes nothing; any problems found go into a separate fix list for your approval.

## What gets checked

1. **Database health**
   - Required tables, triggers and RLS policies exist (enterprise_agreements FSM, feature-gate validation trigger, append-only audit tables).
   - The `governance_profile` default matches the allowed values (QUICK / STRUCTURED / CONTROLLED).
   - Organization Type to Industry links: one active College, no duplicates, every active type mapped (Internal Department flagged).

2. **Legal documents**
   - Every required code (SPA, SKPA, PWA, PRIVACY_POLICY, DPA, RA_R2, CPA_QUICK/STRUCTURED/CONTROLLED) has an ACTIVE version with structured HTML content.
   - The Health card shows no missing items.
   - The Privacy Policy and DPA load into the registration Compliance step, and the accept box unlocks only after scrolling.

3. **Seeker enrollment flow (browser run)**
   - Organization step: picking an Organization Type fills in its Industries automatically, and the step saves without the data error.
   - Primary Contact: the OTP step is hidden while the flag is OFF.
   - Compliance and Billing steps save correctly.

4. **Org admin surfaces**
   - The Profile, Compliance and Billing edit screens save and reload correctly.
   - Delegated admin: the temporary password appears once, and the scope check works.

5. **Platform admin surfaces**
   - The Legal Documents editor auto-saves, publishes, and reopens with the saved content.
   - The Organization Types and Industry Segments pages show and edit the mapping.

6. **Automated tests**
   - Run all Phase 10 Vitest specs (FSM, OTP schema, scope, editability, postal regex, RLS contract) and report pass/fail counts.

7. **Code-rule compliance**
   - List files over 250 lines touched in Phase 10, such as CreateDelegatedAdminPage and PrimaryContactForm.

## Deliverable
A pass/fail table for each item, citing the file, query or screenshot behind each result, followed by a prioritised fix list. Fixes are applied only after you approve them.

## Technical details
- Use read-only SQL queries against tables, `pg_trigger`, `pg_policies` and `legal_document_templates`.
- Run Playwright against localhost:8080 with a minted session for the admin flows.
- Run the tests with `bunx vitest run` on the Phase 10 test files.
