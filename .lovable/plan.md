# Wave 1 Close-out Plan (before Wave 2)

Goal: finish every open Wave 1 item so the registration-to-award journey can be tested end to end, then issue an acceptance report.

## Step 1 — Fix the Solution Provider agreement error
- Reproduce `record "v_org" is not assigned yet` on the Platform Agreement gate for provider@test.local.
- Find the database step that reads the organisation record before it is loaded (likely a provider with no organisation). Make it handle "no organisation" safely instead of crashing.
- Re-test acceptance as the test provider; confirm a row lands in the acceptance ledger.

## Step 2 — Triage the failing automated tests
- Run the full test suite, list each failure, classify as pre-existing defect, stale test, or regression.
- Fix real defects; update stale tests only where the signed-off rule changed. Target: full suite green.

## Step 3 — Award buttons on screens (1B follow-up)
- Add Recommend / Confirm / Return / Countersign actions to the award screen, wired to the existing award steps, shown only to the allowed role per governance mode.
- Confirm must be a different person than the recommender; Return needs a reason.
- Platform-fee "paid" check: add a fee-status field on the challenge (additive) and block Completed until paid.
- "Scheduled" status: add an optional publish start date; status shows Scheduled until that date.

## Step 4 — Curator invitation screen (1C-2 follow-up)
- On Invite-only challenges, a Curator panel to search certified providers, invite, see status (invited/accepted/declined/expired), and revoke.

## Step 5 — Reviewer screens prompt (1C-4 follow-up)
- Quick Review and Screening show "Accept the Platform Workforce Agreement to view solutions" with a link, instead of an empty list, when the reviewer lacks the agreement.

## Step 6 — Creator confidential-field picker (1C-3 follow-up)
- In the brief editor, a "Confidential" toggle per brief section that writes to the existing confidential keys list.

## Step 7 — Hard-coded numbers sweep (CFG-001 tail)
- Search for remaining business-rule numbers (deadlines, limits, percentages) in code; move each to the settings register theme by theme with tests.

## Step 8 — Oversized files
- Split PrimaryContactForm and CreateDelegatedAdminPage (and any other file over 250 lines touched above) without behaviour change.

## Step 9 — Verification and acceptance report
- Signed-in browser run: provider registers → accepts agreements → views eligible challenge → submits → reviewer evaluates → award recommended, confirmed, settled.
- Produce an acceptance report mapping every Wave 1 row (CFG-001, DEF-0008 … DEF-0613) to files changed, tests, and live evidence; list any remaining blocker.

## Technical notes
- All DB changes additive; status/phase still only move via complete_phase and award RPCs.
- New tests per rule: fee-paid gate, scheduled-status derivation, invitation revoke, confirm-by-different-person.
- Browser e2e may be limited (external Supabase session); fallback is test accounts already used in 1C-3.

## Order
Steps 1–2 first (unblock testing), then 3–6 in one batch each, then 7–9. Wave 2 starts after the report.
