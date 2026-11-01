# Plan v2: building the Agreed Fixes (revised workbook)

## 1. What changed in the revised workbook

- Six new columns (S to X): Scope gate, Wave, BUILD NOW (minimum), Deferred to backlog, Merged into and Gate reason. There is also a new **Backlog** sheet with 108 entries.
- The defect text is unchanged. Instructions and acceptance tests were rewritten for 179 rows, all document-only rows that now point to W7.
- Scope gate: 371 S1 Stabilise, 122 S2 Complete, 17 S3 Enhance (moved to the backlog), and 179 with no gate (document-only or no action).
- **Real build work drops from about 510 rows to 411.** That excludes merged rows, S3 rows and document-only rows. By priority: 209 P1, 157 P2 and 45 P3.

| Wave | Topic | Rows to build | P1 |
|---|---|---|---|
| W1 | Foundations | 14 | 11 |
| W2 | Challenge lifecycle | 46 | 37 |
| W3 | Money | 63 | 36 |
| W4 | Legal, roles, registration, security | 147 | 75 |
| W5 | Certification | 81 | 41 |
| W6 | Other | 60 | 9 |
| W7 | Document only | 133 | 0 (not code) |

## 2. Third-party verdict on the revision

**Better than v1.** The scope gate and the "BUILD NOW (minimum)" column fix my main earlier concern, that many "fixes" were really new features. The waves now match the foundation-first order I proposed. Merging rows removes the duplicate fee and release definitions.

**Mistakes and inconsistencies found (fix these in the workbook before building)**

1. **Merged rows sit in a different wave from the row they merge into.** There are 4: DEF-0277→DEF-0015 (W4 vs W2), QR-12→DEF-0369 (W2 vs W3), OI-06→DEF-0143 (W2 vs W1), OI-10→DEF-0493 (W6 vs W4). Use the target row's wave.
2. **A row merged into a row that won't be built.** OI-28 merges into DEF-0523, which is document-only or S3. That would lose the item silently. Move it to a buildable row or to the Backlog.
3. **22 S2 rows have no "BUILD NOW" text**, even though the How-to sheet says S2 builds only that text. Examples: DEF-0022, 0025, 0041, 0055, 0057, 0076, 0079, 0118, 0147, 0208, 0209, 0213, 0215, 0239, 0245, 0248, 0377, 0433, 0467, QR-21, OI-04, OI-10. Either fill it in, or confirm that "full AGREED FIX" applies to these rows.
4. **Two rows are S3 (backlog) but still marked P1:** DEF-0314 (daily reconciliation report) and DEF-0559 (incident management screen). Lower the priority, or drop the deferral.
5. **P1 rows placed in W6.** There are 9: DEF-0024, 0046, 0099, 0100, 0136, 0137, 0153, 0485, 0565. DEF-0024, the notifications NTF-077 to 100, is needed by the W2 and W3 acceptance tests, such as award and escrow alerts. Move it to W2/W3, or accept that those tests will not check notifications until W6.
6. **P3 rows in W1/W2:** DEF-0113, 0518, 0613, 0616. These are fine if they are small, but list them as optional within the wave.
7. **CFG-001's "BUILD NOW" leaves out** the scopes by country, organisation and so on, and the second-Supervisor approval. The acceptance test still mentions "a Senior Admin cannot open…" and the owner decision mentions "second approval for sensitive settings". Fix the acceptance test to match the reduced scope, or the test will fail by design.
8. **W4 is too big (147 rows).** Split it into W4a Legal, W4b Roles and permissions (DEF-0069, the 66-permission matrix, is in W1, so W4b depends on it), W4c Registration, and W4d Security and Pulse.
9. **The "Your decision" and "Your comment" columns are empty for all 689 rows.** They need your sign-off before each wave, otherwise there is no approval trail.
10. **The Owner decision column changed on 663 rows.** Most now show blank, and only about 31 hold text. Please confirm the blanks were intentional, so we don't lose the 1 November approvals.

**Points that fit how Lovable works (no change needed)**
- Scheduled jobs (J22 escrow release, the 30-day purge) can run as scheduled database jobs, which is supported.
- Simulated payments, no invoices, no live email or SMS, and no MFA all match what the app can do today.
- 5 to 10 rows per request is the right size. Larger batches cause the loops we saw before.

## 3. Plan of action

```text
W0 Triage -> W1 Foundations -> W2 Lifecycle -> W3 Money -> W4a-d -> W5 Certification -> W6 -> W7 BRD v1.2
```

- **W0 – Triage (no code).** For each of the 411 rows, record Built / Partial / Missing against the code and the live database. Apply corrections 1 to 7 above as suggestions. Output: an annotated copy of the workbook in Files with a "Current state" column and a list of issues.
- **W1 (14 rows).**
  - CFG-001: settings register, Supervisor-only editing, reason and audit entry, values copied onto each item at its start, working week. Build on the existing System Config screen.
  - Phase/status map and transition guard (DEF-0008, 0018, 0030, 0145, 0151).
  - Server-side confidentiality (DEF-0034, 0060).
  - Visibility fields (0035), status sets (0044), permission matrix (0069), change reason (0533), Pulse settings access (0564).
- **W2 to W6.** Batches of 5 to 10 rows per request, grouped by theme. For S2 rows, build only the BUILD NOW text. Merged rows are built inside their target row.
- **W7.** BRD v1.2 covering the 133 document-only rows, plus a description of what was actually built.

## 4. How each batch is delivered and accepted
- Database change with RLS → service → query layer → screen, with all four states, files of 250 lines or fewer, and numbers read from settings only.
- Each row's acceptance test becomes a Vitest test (logic) or a browser run (flow).
- Report per batch in full sentences, with files and evidence. Update the workbook's Current state.

## 5. Decisions needed
1. Approve W0, then W1.
2. Rule on mistakes 3, 4, 5, 7 and 10, or allow W0 to propose the answers.
