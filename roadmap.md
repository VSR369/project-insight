# Roadmap – signed-off BRD fixes (411 build rows)

- [x] W1 Batches 1A/1B/1C and close-out Steps 1–9 (see acceptance report v1)
- [x] W1 re-open items (VSR 5 Nov) — done; open: signed-in manual run, real money-threshold ranges, 7 definer views, leaked-password switch
  - [x] R1 DEF-0145: countersign only when recommender = confirmer would be same person; different confirmer = final
  - [x] R2 CFG-001: per-setting allowed range enforced; Admin/Senior Admin refused server-side; snapshot on enrolments, assessments, bookings, awards; per-currency money thresholds; platform "Working week" setting
  - [x] R3 Remove client fallback values; register unreadable = error on screen
  - [x] R4 DEF-0034: "Seeking organisation: Confidential" for providers; name revealed to winners at award confirmation; audit every view/download of confidential content
  - [x] R5 DEF-0069 evidence: 13 groups / 66 permissions (Admin 15, Senior Admin 49, Supervisor 66); Basic Admin direct certification approval refused
  - [x] R6 Rename "Prize & Work Agreement" → "Platform Workforce Agreement"
  - [x] R7 List 43 changed tests + 69 skipped with rule each follows
  - [x] R8 Fix DB warnings: missing RLS, exposed functions
  - [x] R9 New setting solution_approach_summary_min_chars=200; keep abstract_min_chars=300
  - [x] R10 Manual script additions (5 signed-in checks) + acceptance report v2
- [ ] W2 Lifecycle (51) · W3 Money (63) · W4a Legal (17) · W4b Roles (59) · W4c Registration (51) · W4d Security/Pulse (21) · W5 Certification (81) · W6 Other (54)
- [ ] W7 BRD v1.2 text (133 rows)
- [ ] Replace remaining hard-coded numbers with settings, theme by theme (W2+)
