# Plan v3: build the signed-off fix list, starting with Wave 1

## 1. Review of the signed-off workbook (third-party check)

- Signed off on 1 November 2026 as Final 1.0. All 689 rows have a decision:
  - 411 Approve – build
  - 133 BRD only
  - 82 merged
  - 46 no action
  - 17 backlog
- All 10 issues from my plan v2 review are fixed:
  - W4 is split into W4a, W4b, W4c and W4d.
  - The 9 P1 rows that sat in W6 have moved; notifications are now in W2.
  - Each S2 row now has BUILD NOW text, or says "build the full fix".
  - Priorities are corrected on the two backlog rows.
  - Merged rows sit in the same wave as the row they merge into.
  - The Owner decision column has 32 entries, with blank meaning no owner decision was needed.
- The build totals agree with the Wave plan sheet: W1 14, W2 51, W3 63, W4a 17, W4b 59, W4c 51, W4d 21, W5 81, W6 54. That is 411 rows: 209 P1, 157 P2 and 45 P3.
- I found no remaining contradictions. **The workbook is ready to build.**

## 2. How we avoid breaking the existing system

- Database changes only add things: new tables, columns and settings with defaults that match today's behaviour. Nothing is renamed or dropped.
- All phase changes keep going through the existing phase-completion step, which already handles every transition. New guards are added inside that step, never beside it.
- New rules are tried on the screens first. Database enforcement is switched on once the existing tests and a browser run pass.
- Before each batch: run the existing tests. After each batch: run them again, plus the new tests and a browser run of the affected journey.
- Each batch is 5 to 7 rows and gets its own report.

## 3. Wave 1 – Foundations (14 rows, in 3 batches)

**Batch 1A – Settings register (CFG-001, DEF-0533, DEF-0613)**
- Extend the existing System Config screen, adding to the current settings rather than replacing them. Each setting gets:
  - a default value and an allowed range
  - a sensitive flag
  - an amount per currency where it is a money threshold
- Only the Supervisor can edit settings. A reason of 10 to 500 characters is required, and every change is audited with who, when, old value, new value and reason.
- Seed the settings the workbook names, including the 14-day minimum open period, the 10-day dispute window, the 14-day award acceptance period, the file limits, a correction-cycle limit, invitation expiry and a working week of Monday to Friday (UTC).
- When a challenge, assessment, booking, enrollment or award starts, copy its governing values onto it.
- Replace hard-coded numbers in the code with these settings, theme by theme, starting with the challenge wizard. The correction-cycle label will read "<n> of <Max Correction Cycles>".

**Batch 1B – Status map, step owners and transition guard (DEF-0008, 0018, 0030, 0044, 0145, 0151)**
- Add the status sets ST-52 to ST-59 as lookup lists.
- Encode the phase-to-status map and the step-owner map for Marketplace and Aggregator, including the Express column. Recommender and confirmer must be different people, or the award goes to "Awaiting Platform countersign".
- The phase-completion step refuses the wrong actor with "You are not allowed to move this challenge to <status>."
- Remove the Platform Admin controls that change a challenge's status directly.

**Batch 1C – Provider visibility, permissions and Pulse settings (DEF-0034, 0035, 0060, 0069, 0564)**
- Visibility options: Eligible certified providers (the default), Invite only and Public. Add Industry segment and Minimum expertise level to the brief.
- The eligibility rule applies to the challenge list, the challenge page and the server.
- Confidential fields and files are returned only after the provider accepts the CPA. The seeker shows as "Seeking organisation: Confidential" unless revealed, and every view of confidential content is audited.
- Abstract and solution records and files are restricted to the submitter, the assigned evaluators and the award roles.
- Seed the permission matrix of 66 permissions.
- Only holders of 'Configure System' can open Pulse settings.

## 4. Later waves (same method, 5 to 7 rows per request)
- **W2** Challenge lifecycle core (51) → **W3** Money (63) → **W4a** Legal (17) → **W4b** Roles (59) → **W4c** Registration (51) → **W4d** Security and Pulse (21) → **W5** Certification (81) → **W6** Other (54) → **W7** BRD v1.2 text (133 rows, a document, not code).

## 5. Evidence after every batch
- A full-sentence acceptance report naming files, database changes, the tests run and their results, and browser checks.
- An updated copy of the workbook in Files, with the "Current state" column filled in for each row.

## Technical notes
- Settings: extend the existing system configuration table with range, sensitive, scope and currency columns, plus an append-only audit table protected by RLS. Read settings through a typed hook with a 15-minute cache.
- Guard: extend the existing phase-completion function with an actor check driven by a step-owner lookup table, never hard-coded.
- Visibility: enforce through RLS and a secured view or function for challenge detail, with an append-only audit table for confidential access.
- Every new table gets grants, RLS and indexes. Every new file stays at 250 lines or fewer.
