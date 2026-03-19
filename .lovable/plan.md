
Goal: eliminate the recurring “Organization not found…” error on Generate with AI by fixing the real upstream causes (not just the toast).

1) 5-Why Analysis (with evidence)

Problem: User clicks “Generate with AI” and always gets “Organization not found...”.

Why 1: The client blocks before calling AI when `currentOrg` is null.  
- Evidence: `src/pages/cogniblend/ConversationalIntakePage.tsx` lines 217-220.

Why 2: `currentOrg` is null because `org_users` has no active row for current user.  
- Evidence: network call `/rest/v1/org_users?...user_id=eq.5c83...` returned `[]`.

Why 3: Current session user is `nh-am@testsetup.dev` (id `5c83...`), and that user has no org or challenge-role records.  
- Evidence: DB query shows no rows in `org_users` / `user_challenge_roles` for this user.

Why 4: Demo login UI is out of sync with the seeded scenario users.  
- Evidence: `DemoLoginPage` shows `nh-am` + role `AM`, but `setup-test-scenario` (`new_horizon_demo`) seeds `nh-rq` (RQ) and does not seed `nh-am`.

Why 5: Credentials/roles are duplicated in two places (frontend hardcoded + edge function scenario) with no consistency guard or access gate.  
- Result: stale demo account can still login and reach create page, then fails late.

2) Root Causes to Close

RC-A: Demo user/source-of-truth drift (hardcoded frontend list mismatches seeded backend scenario).  
RC-B: Missing preflight guard for create workflow (route accessible even when org context is missing).  
RC-C: Dashboard fallback routes users with no active role to “Create” (default CR action), amplifying bad path.  
RC-D: Error handling is late + generic (user gets a dead-end toast instead of remediation).

3) Implementation Plan

Step 1 — Fix demo credential drift at source  
Files:  
- `src/pages/cogniblend/DemoLoginPage.tsx`  
- (optional) `supabase/functions/setup-test-scenario/index.ts`  
Changes:  
- Remove stale hardcoded `nh-am` card from New Horizon flow.  
- Drive login cards from seeded response credentials (or align static list exactly to scenario users).  
- Ensure AGG demo shows RQ (not AM) for Alex.

Step 2 — Add login/session preflight validation  
File: `src/pages/cogniblend/DemoLoginPage.tsx`  
Changes:  
- After sign-in, validate user has `org_users` active row + at least one challenge role.  
- If invalid: immediate sign-out + clear message: “This account is not part of seeded New Horizon scenario. Use seeded role cards.”

Step 3 — Add hard guard on Create page (fail-fast UX)  
File: `src/pages/cogniblend/ChallengeCreatePage.tsx` (or route wrapper in `App.tsx`)  
Changes:  
- If `useCurrentOrg()` is null, show blocking state (not the editor/intake) with actions:  
  - “Go to Demo Login”  
  - “Re-seed scenario” guidance  
- Prevent rendering “Generate with AI” in invalid org state.

Step 4 — Remove misleading fallback action for no-role users  
File: `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`  
Changes:  
- Replace `ROLE_PRIMARY_ACTION['CR']` fallback when `activeRole` is empty.  
- Show safe fallback CTA (e.g., “Set up Demo Access” -> `/cogni/demo-login`) instead of sending no-role users to create flow.

Step 5 — Improve error copy and observability  
File: `src/pages/cogniblend/ConversationalIntakePage.tsx`  
Changes:  
- Replace generic toast with context-aware message + remediation action when org missing.  
- Add lightweight warning log metadata (userId/email + route + org-null) for easier triage.

4) Closure Criteria (done means root cause closed)

- Seeding New Horizon shows login cards that exactly match seeded users/roles.  
- Logging in with valid seeded user (e.g., `nh-rq`) allows Generate with AI and creates an actual `generate-challenge-spec` network call.  
- Logging in with stale/unseeded account cannot proceed into create workflow; user gets guided recovery.  
- No user with missing org context can trigger the “Generate with AI” dead-end toast anymore.  
- Dashboard no longer routes no-role users into create workflow.
