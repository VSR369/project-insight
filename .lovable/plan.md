# Wave 2 — Submissions module: close-out, one item at a time

Current module: **Wave 2 → Challenge lifecycle → Submissions & deadlines** (from the approved remaining-features plan). Stages/deadlines, Curator extensions, shortlisting, J17 (Scheduled → Published) and J18 (deadline close) are done. The rest of this module is below, fixed in order. Each step ends with tests and a clean build before the next starts.

## Step 1 — J19 confidential submission purge
- Daily job at 04:00 UTC (1 run/day).
- Once a non-selected abstract/solution reaches its recorded purge date: permanently remove its content and stored files.
- Keep the submission record (who, when, status) and audit history; log each purge.
- Safe to re-run; never touches selected/winning submissions or records under dispute.

## Step 2 — DEF-0037 submission limits from snapshot
- Submission limits (file count, size, word counts) read from the challenge's publication snapshot, so later setting changes don't affect a running challenge.

## Step 3 — DEF-0113 one per provider
- Server refuses a second abstract/solution from the same provider on a challenge.
- Each award line can go to only one provider.

## Step 4 — DEF-0159 originality declaration
- Provider must tick the originality declaration before submitting; server refuses without it and records when it was accepted.

## Step 5 — DEF-0369 Maximum awards
- Server refuses award recommendations beyond the challenge's "Maximum awards".

## Step 6 — Carried-forward items in this module
- Step-by-step creator wizard uses the same minimum-governance picker as the simple form.
- Automated test for the USD 50,000 legal-review threshold.

## Then
Update roadmap.md and give an evidence report (files, tests, database checks). Next module: Evaluation configuration and scoring.

## Technical details
- Purge: private SECURITY DEFINER function + public SECURITY INVOKER wrapper pattern; pg_cron schedule; storage deletion via edge function using service role; append-only audit entries.
- Limits, one-per-provider, declaration and max-awards enforced in database triggers/RPCs, mirrored by service-layer rule tests; UI shows readable refusal messages.
- No direct status writes; lifecycle changes stay inside server steps.

## Still waiting on you
Signed-in test account (69 integration tests + role-based browser checks), signed-in manual script, leaked-password protection.
