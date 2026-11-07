# Remaining features – signed-off fix list (as of 7 Nov 2026)

Source: the signed-off workbook (689 rows) and the project task list. Wave 1 is closed. Wave 2 has started.

## Done in Wave 2 so far
- The 7 flagged database views fixed (DEF security review)
- Cancel rights by phase (DEF-0043)
- Minimum governance mode: Express limit / High-Rigor threshold per currency, Regulated and IP-sensitive flags (DEF-0144)
- Legal-review threshold reconnected for Structured challenges

## Waiting on you
- Run the signed-in manual script
- Test account in a test environment so the 69 integration tests run every wave
- Turn on leaked-password protection

## Known gaps carried forward
- Activity-feed history is readable by any signed-in user
- Second-Supervisor approval for Express / High-Rigor limit changes (backlog)
- 119 older database security warnings
- No automated test yet for the legal-review threshold rule

## Wave 2 – Challenge lifecycle (about 47 rows left)
1. Create Challenge: mandatory Governance Mode picker (DEF-0013); exact 5/8/12 brief fields per mode (DEF-0027); Governance profile on the organisation (DEF-0143, OI-06); IP model at Create (with W4a)
2. Stages and timeline: Express single-stage, Structured choice, High-Rigor two-stage (DEF-0157); start date, abstract and solution deadlines in UTC (DEF-0036); Scheduled → Published job J17 (DEF-0086)
3. Submission rules: limits copied at publication (DEF-0037, OI-24); one provider per abstract/solution/award (DEF-0113); originality declaration (DEF-0159); "Max solutions" renamed "Maximum awards" (DEF-0369, QR-12)
4. Evaluation: criteria with weights totalling 100 % (DEF-0154); panel score averaging (DEF-0156); minimum award score (DEF-0158); role named per evaluation screen (DEF-0165)
5. Pool and teams: pool members use their role screens (DEF-0021/0074); role holders can't join (DEF-0155); Industry Segment on solution request (DEF-0296); withdraw request (DEF-0297); team-complete notice NTF-026 (DEF-0519)
6. After publication: brief, criteria, award, IP, eligibility and CPA read-only (DEF-0152)
7. Notifications: action notices 077–087 and NTF-101/102 (DEF-0024, DEF-0153, DEF-0293)
8. Timers and jobs: Challenge Lifecycle settings group P26/P27 (DEF-0134/0118); escalation recipients (DEF-0164); scheduled jobs J02a/J02b at agreed cadences (DEF-0085)
9. Audit: append-only entries for phase completion, gate results, decisions (DEF-0166)
10. Org-type mapping to the 9 seeded types (DEF-0046/0382); draft restore on re-sign-in (DEF-0376)
11. Remaining "build in full" rows: DEF-0026, 0033 (QR-08), 0048, 0107, 0133, 0136, 0137, 0142, 0160, 0162, 0163, 0289, 0295, 0366, 0404, 0518, 0616, QR-18 (OI-08), OI-16
12. End-to-end test group: phases 1–10 per governance mode (DEF-0139)

## Wave 3 – Money (63 rows)
- Platform fee record on award confirmation, "Paid (Simulated)" (DEF-0016, 0114)
- Escrow by mode, release after dispute window, payment buttons only for the right roles (DEF-0028, 0029, 0032)
- Award total, number and split fixed at submission (DEF-0039); provider disputes (DEF-0042)
- Fees and currency copied at submission; one billing currency per organisation; two-line "Due Today" (DEF-0184, 0188, 0290, 0405, 0385, 0537)
- Challenge allowance, per-challenge charge, rate-missing handling (DEF-0050, 0393, 0407)
- Membership: upgrade/downgrade, renewal, conversion, end-of-term, internal departments, shadow charges (DEF-0174–0179, 0386, 0391, 0397, 0403, 0562, QR-17, OI-13)
- Subsidies: daily expiry job and plan-change rule (DEF-0194, 0411)
- Payment methods by country (DEF-0191, 0409); Aggregator plan-card wording (DEF-0049, 0126, QR-16)
- Money audit entries (DEF-0088); jobs J12/J13/J22 (DEF-0383); retries only on reads (DEF-0138)

## Wave 4a – Legal (17 rows)
- One legal-document model; per-document acceptance lines (DEF-0052, 0053)
- Joining a challenge legal step; IP model at Create (DEF-0055, 0056)
- Who accepts for the organisation; new versions; blocked journeys while a document is missing (DEF-0204, 0209, 0210)
- Legal screens guarded by permission group 12; acceptance ledger; Privacy Policy acknowledged not consented (DEF-0211, 0212, 0214, 0215)
- CPA rendered at Compliance completion (DEF-0216); RA_R2 row; scroll rule (DEF-0420, 0422)
- Panel Reviewers accept PRA only; SPA wording; enterprise agreement Draft → Activate (QR-02, QR-05, OI-18)

## Wave 4b – Roles, notifications, jobs (59 rows)
- Platform Admin and Delegated Admin activation links; password reset links; link-expiry checks (DEF-0078, 0267, 0294, 0302)
- Auto-assignment by tier depth; access codes rules; deactivation ends sessions (DEF-0278, 0280–0283)
- MSME / Small Team Mode role minimums (DEF-0084); PWA before first pool assignment (DEF-0288, 0298)
- Marketplace-only roles managed by Platform Admins (DEF-0292); confidentiality in all messages (DEF-0087)
- PRA seeding; remaining scheduled jobs (J16 and others); other notification rows

## Wave 4c – Registration, verification, organisations, billing (51 rows)
- Registration steps, verification queue, organisation records and billing setup rows

## Wave 4d – Security, privacy, cross-cutting (21 rows)
- Security and privacy rows, including closing the activity-feed exposure

## Wave 5 – Certification, assessment, reviewers (81 rows)
- Assessment, interview, certification decision and reviewer rows

## Wave 6 – Industry Pulse, master data, other (54 rows)
- Pulse, master-data and remaining rows

## Wave 7 – BRD v1.2 text (133 rows, document only)
- Update the BRD wording; no app changes

## Running alongside every wave
- Replace remaining fixed numbers with settings, theme by theme
- Keep files under 250 lines; tests per rule; acceptance report per wave

## Suggested next step
Continue Wave 2 in batches of 5–10 rows, starting with items 1–3 (Create Challenge, stages/timeline, submission rules), each batch with its tests before the next.
