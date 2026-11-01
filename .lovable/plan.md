# Review of "CogniSpark BRD Agreed Fixes" and plan of action

## 1. What the workbook contains

- 689 rows: 85 Critical, 225 Major, 215 Moderate, 105 Minor, plus 29 owner rulings and 30 open items.
- How each row is handled: 429 Code change, 57 Code + configuration, 24 Configuration / seed data, 133 Document only, 46 No action.
- That leaves **510 rows of build work**: 267 P1, 226 P2 and 196 P3 (the P3 count includes some document-only rows).
- Where the P1 build rows sit: Challenge lifecycle 74, Certification/assessment 42, Fees/payments 35, Roles/access 31, Legal 18, Registration 18, Master data 8, Security 7, Owner rulings 6, Notifications 5, Scheduled jobs 4, Pulse 3, Open items 3.

## 2. My overall view as a reviewer

**What's strong**
- Each row has a single build text, a Given/When/Then acceptance test and a priority. That gives us rows we can trace and test.
- CFG-001 (every number is a setting, controlled by the Supervisor, audited, with a second approval for sensitive settings and values fixed when an item starts) is the right foundation for a global product. It must come first.
- The rows respect the phase rules: payments are simulated, there are no invoices, no OTP or MFA at sign-in, and passwords are never emailed. Most security rows close real gaps, such as hiding confidential challenge data from providers and anonymous seekers.

**What worries me (critical concerns)**
1. **Size and wording.** Roughly 510 build rows is a programme of work, not a list of fixes. Many "fixes" are really new features: dispute handling, award accept/decline, the Marketplace pool workspace, 24 new notifications (NTF-077 to NTF-100), purging files after 30 days, and escrow release by a scheduled job (J22). We should plan them as features.
2. **Hidden dependencies.** About 60% of the lifecycle rows depend on three foundations that don't exist in full today:
   - the settings register with scopes and snapshots (CFG-001). The app has a basic System Config screen, but no scope by country, currency, industry or organisation, no second approval and no snapshot.
   - one single challenge status/phase map (ST-24 / 10.2.3a) with the actor for each step.
   - a server-side layer that controls what providers can see.
   If we build rows before these exist, we will build them twice.
3. **Rows that overlap.** For example, DEF-0010, DEF-0016 and DEF-0040 all define the platform-fee record, and DEF-0029 and DEF-0041 both cover release. These must be merged into one requirement before coding, or the code will contradict itself.
4. **Gaps the acceptance tests don't cover.** Some tests only check the happy path. The "all four states" and multi-tenant isolation checks need an RLS assertion added to each data row.
5. **The app today versus the rows.** The dispute records table exists but has no screens. Award acceptance doesn't exist. Fee and escrow tables exist. Each row therefore needs a quick check of "already built / partly built / missing" before we size it. That check is item W0 below.
6. **The 30 open items and 29 owner rulings** can block work. Open items on P1 paths need an owner answer before their wave starts.
7. **The 250-line file rule.** Several lifecycle screens are already over the limit. Splitting them should happen inside each wave, not as a separate clean-up.

**Verdict:** the content is sound and worth building. But it must be delivered as foundation-first waves of 5 to 10 related rows, each tested before the next starts. Trying to "fix everything at once" will reproduce the loops we hit earlier.

## 3. Plan of action (waves)

```text
W0  Triage (no code)    -> W1 Foundations -> W2 Lifecycle core -> W3 Money
                                          -> W4 Access/Legal   -> W5 Certification
                                          -> W6 P2 rows        -> W7 P3 rows + BRD v1.2
```

- **W0 – Triage (1 turn).** Mark every build row as Built / Partial / Missing against the code and the database. Merge overlapping rows and list blocking open items. Output: an updated workbook with a "Current state" column, a "Merged into" column and a wave number.
- **W1 – Foundations (P1).**
  - CFG-001: a settings register with scope levels, min/max, Supervisor-only editing, a reason and audit entry for every change, second approval for sensitive settings, and a value snapshot on each challenge and enrollment at the start.
  - Replace the hard-coded numbers in the code with settings.
  - Single status/phase map and transition guard, so only the step owner can move a challenge (DEF-0008, 0018, 0030).
  - Server-side provider visibility (DEF-0025, 0034).
  - Seed the permission groups 12 and 13 (DEF-0020).
- **W2 – Challenge lifecycle core (P1).**
  - Governance-mode picker and fields per mode (DEF-0013, 0027), visibility and eligibility (0023, 0035), timeline order (0036).
  - Submission limits (0037), Express auto-compliance (0026), the Marketplace pool workspace (0021).
- **W3 – Money (P1).**
  - Escrow by mode (0028) and release by the J22 job (0029, 0041).
  - The single merged platform-fee record (0010/0016/0040), payer rules (0032), award accept/decline (0039) and disputes (0042).
  - The tie rule and the full refund owner rulings.
- **W4 – Legal, roles, registration and security (P1).** Accept the role document before first access (0019, 0022), the rest of the role and access rows, the registration rows, and the Pulse confidential-report flow (0002).
- **W5 – Certification, assessment and reviewers (P1, 42 rows).**
- **W6 – P2 rows by theme**, including the 24 notifications and the scheduled jobs.
- **W7 – P3 rows**, then bring the BRD document up to v1.2 to match what was built, including the 133 document-only rows.

## 4. How each wave is delivered
- Take 5 to 10 rows with the same theme. For each row: database change with RLS → service logic → query layer → screen, with all four states and files of 250 lines or fewer.
- Turn each row's acceptance test into an automated test where it is pure logic, and a browser run where it is a flow.
- After each wave: run the tests, check the logs, fill in the workbook's "Your decision / comment" columns with evidence, and give you a full-sentence acceptance report.

## 5. Decisions needed from you
1. Approve W0 triage first? I recommend it. It turns the 510 rows into a sized, merged backlog before any code is written.
2. Answer the open items on P1 paths. W0 will list them.
3. Confirm that document-only rows wait until W7.
