# Wave 1 close-out — final three steps

Steps 1–6 are done. No inputs are needed from you; these remaining steps proceed on the signed-off workbook.

## Step 7 — Hard-coded business-rule number sweep
- Search the app and database functions for business-rule numbers (deadlines, day counts, limits, percentages, thresholds) written directly into code.
- Each one found is either moved into the settings register (read live, or from the challenge's saved snapshot for running challenges) or recorded as "not a business rule" (e.g. layout sizes).
- Existing values stay identical, so behaviour does not change; only the source moves.
- Output: a sweep list (file, value, decision) kept for the acceptance report.

## Step 8 — Split oversized files
- List every file over 250 lines, including those touched in Wave 1.
- Split by responsibility (screen layout vs. sections vs. data hooks vs. rules) without changing behaviour.
- Run the full test suite before and after; counts must match (currently 1,105 passed, 0 failed, plus the new tests added in Steps 3–6).

## Step 9 — Verification and acceptance report
- Run the full test suite and confirm a clean build.
- Re-run the live database checks: anonymous access denied, deadline freeze, confidential-field movement, invitation access, award confirm/countersign by different people.
- Produce a downloadable acceptance report (Word) mapping each Wave 1 signed-off row to: what was built, file names, test evidence, and any remaining limitation, written in full sentences.
- Known limitation to state plainly: signed-in, multi-user click-through tests are not possible here because sign-in is managed outside Lovable; you or a tester would need to do those manually. The report will include a short manual test script for that.

## After approval
Wave 2 (Lifecycle, 51 rows) starts only after you review the acceptance report.
