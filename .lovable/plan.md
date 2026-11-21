# Pending features (signed-off fix list) and next batch

## Done since the 7 Nov list
- Marketplace hides Express; organisation defaults; form keeps values on mode change; Curator can only raise mode after submission (DEF-0013)
- Mode cards below the challenge's required minimum are disabled and selection auto-raises (DEF-0144)
- Activity history no longer readable by every signed-in user

## Waiting on you
- Run the signed-in manual script
- Test account in a test environment (69 integration tests)
- Turn on leaked-password protection

## Carried-forward gaps
- Second-Supervisor approval for Express / High-Rigor limit changes (backlog)
- 119 older database warnings (mostly functions callable by signed-in users; each needs checking against its screen)
- No automated test for the legal-review threshold rule
- Step-by-step challenge wizard not yet aligned with the minimum-mode picker

## Wave 2 – Challenge lifecycle (still open)
1. Create Challenge: exact 5/8/12 brief fields (DEF-0027); org governance profile (DEF-0143); IP model at Create
2. Stages and timeline: Express single-stage, Structured choice, High-Rigor two-stage (DEF-0157); start / abstract / solution deadlines in UTC with order and minimum-open checks, Curator-only bounded extensions (DEF-0036); Scheduled → Published job (DEF-0086)
3. Submission rules: limits copied at publication (DEF-0037); one provider per abstract/solution/award (DEF-0113); originality declaration (DEF-0159); "Maximum awards" (DEF-0369)
4. Evaluation: weights total 100 % (DEF-0154), score averaging (DEF-0156), minimum award score (DEF-0158), role named per screen (DEF-0165)
5. Pool and teams (DEF-0021/0074/0155/0296/0297/0519)
6. Read-only brief after publication (DEF-0152)
7. Notifications 077–087, NTF-101/102
8. Lifecycle timer settings and jobs (DEF-0134/0118/0164/0085)
9. Append-only audit entries (DEF-0166)
10. Org-type mapping; draft restore on re-sign-in (DEF-0046/0382/0376)
11. Other build rows (19)
12. End-to-end phases 1–10 per mode (DEF-0139)

## Later waves
W3 Money (63) · W4a Legal (17) · W4b Roles (59) · W4c Registration (51) · W4d Security (21) · W5 Certification (81) · W6 Pulse/other (54) · W7 BRD text (133) · ongoing fixed-number sweep

## Next batch to build (on approval): Wave 2 item 2 – stages and deadlines
- Stage choice stored on the challenge: Express always single-stage, High-Rigor always two-stage, Structured chosen by Creator and changeable by Curator during Curation; frozen at publication (server-enforced).
- Three deadline dates (start, abstract for two-stage only, solution) stored in UTC and shown in UTC plus the viewer's time zone.
- Server check: dates in order and each open period at least the per-mode minimum from the settings register (new settings, no fixed numbers).
- Curator-only extension with a reason, bounded by a maximum-extension setting; no shortening once published; audited.
- Rule tests for each of the above; build check; roadmap and acceptance notes updated.

## Technical notes
- New columns on challenges (stage_count, start/abstract/solution deadline timestamps) via an additive migration; validation trigger plus an extend_challenge_deadline RPC with authorization.
- Pure rule functions in a lifecycle service with Vitest tests; hooks wrap the RPC; Create panel gets a small stage/deadline card (keep files under 250 lines).
- Existing phase schedule (StepTimeline) stays untouched in this batch to avoid breaking current flows.
