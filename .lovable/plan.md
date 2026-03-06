

# MOD-03 Gap Analysis: Tech Spec & BRD vs Current Implementation

## What Is Fully Implemented (No Gaps)

- Database: `platform_admin_verifications` table, `verification_check_results` table, all RLS policies, `fn_immutable_sla_start` trigger, `fn_sync_admin_workload` trigger, `fn_seed_verification_checks` trigger
- RPCs: `claim_from_queue` (atomic FOR UPDATE NOWAIT), `release_to_queue` (window check)
- Edge Functions: `sla-escalation` (3-tier), `queue-escalation` (unclaimed alerts)
- UI: All 13 components created, both pages, sidebar nav, lazy routes
- Modals: MOD-M-01 (Claim), MOD-M-02 (Release), MOD-M-03 (Reassignment)
- 3-state detail page logic (EDIT/READ-ONLY/BLOCKED)
- V1-V6 check panel with V6 guard, auto-save, progress bar

---

## Gaps Found

### GAP-1: Missing Tab Count Badges (SCR-03-01 / SCR-03-02)
**Spec:** Tab labels should show count badges: "My Assignments (7)" and "Open Queue (3)".
**Current:** Tabs show static text only. No count badges.
**Fix:** Pass counts from `useMyAssignments` and `useOpenQueue` into tab trigger labels.

### GAP-2: Missing Tier Warning/Breach Banners on Dashboard (SCR-03-01)
**Spec:** Conditional banners above the table: amber "N verification(s) approaching SLA deadline" (Tier 1), red "N SLA-breached verification(s) require immediate attention" (Tier 2+).
**Current:** No banners. Dashboard goes straight to tabs and table.
**Fix:** Count Tier 1 and Tier 2+ entries from `useMyAssignments` data, render amber/red Alert banners between header and tabs.

### GAP-3: Missing Industry Tags Column (SCR-03-01 & SCR-03-02)
**Spec:** "Industry Tags" column with up to 2 blue pill chips + "+N" overflow.
**Current:** MyAssignmentsTab has no Industry Tags column. OpenQueueTab also missing.
**Fix:** Fetch `industry_segment_ids` from org data, resolve to names, render chips in table.

### GAP-4: Missing "Days Remaining" Column (SCR-03-01)
**Spec:** "Days Remaining" column with signed integer: green positive, amber zero, red negative.
**Current:** Not present. Only SLA Progress bar and Tier badge shown.
**Fix:** Calculate days remaining from SLA deadline, render color-coded number.

### GAP-5: Missing SLA Deadline Column (SCR-03-01 & SCR-03-02)
**Spec:** "SLA Deadline" column showing absolute date + relative countdown: "12 Mar 2026 5:00 PM · 2d 4h remaining" or "Breached 6h ago".
**Current:** SLA progress bar exists but no separate deadline text column.
**Fix:** Add column computing and displaying deadline date + countdown text.

### GAP-6: Missing Org Type Column in Open Queue (SCR-03-02)
**Spec:** Queue table should include "Org Type" column.
**Current:** Not present.
**Fix:** Add org type lookup and column.

### GAP-7: Missing "Time in Queue" Color Coding (SCR-03-02)
**Spec:** Time in Queue text: amber if >2hr, red if >4hr.
**Current:** Always default muted color via `formatDistanceToNow`.
**Fix:** Calculate hours, apply amber/red text color classes.

### GAP-8: Supervisor STATE 2 Banner Missing "Reassign to Me" Button
**Spec:** Amber banner should include "Reassign to Me" blue button for supervisors.
**Current:** Banner is text-only with no action button.
**Fix:** Add a "Reassign to Me" or "Force Reassign" button to STATE 2 banner.

### GAP-9: SLA Tier Badges Missing Emoji/Icon Indicators
**Spec:** T1 = "⚠ T1", T2 = "🔴 T2", T3 = "🚨 T3 CRITICAL".
**Current:** Shows plain text: "SLA Warning", "SLA Breached", "CRITICAL" without emoji/shortcodes.
**Fix:** Update `SLAStatusBadge` labels to match spec format.

### GAP-10: Missing "Org Details" and "Registrant Comms" Tabs on Detail Page
**Spec:** SCR-03-03 has 4 tabs: Org Details | Verification Checks | Assignment History | Registrant Comms.
**Current:** Only 2 tabs: Verification Checks | Assignment History.
**Fix:** Add stub/placeholder tabs for Org Details and Registrant Comms.

### GAP-11: Assignment History Missing "From Admin", "To Admin", and "Domain Score" Columns
**Spec:** Columns: Date/Time, Event, From Admin, To Admin, Reason/Method, Domain Score.
**Current:** Only 4 columns: Date/Time, Event, Initiator, Reason. Missing From/To admin name resolution and Domain Score from scoring_snapshot.
**Fix:** Resolve `from_admin_id` / `to_admin_id` to names via lookup, add Domain Score column reading from `scoring_snapshot`.

### GAP-12: Claim Success Should Navigate to Detail Page
**Spec:** TC-03-005: "Admin redirected to SCR-03-03 STATE 1" after successful claim.
**Current:** `useClaimFromQueue` only shows toast and closes modal. No navigation.
**Fix:** On claim success, navigate to `/admin/verifications/${verification_id}`.

### GAP-13: `sla-escalation` Edge Function Not Tier-Aware
**Spec:** pg_cron calls the function with `{ tier: 1 | 2 | 3 }`, and the function processes only that specific tier.
**Current:** Function processes ALL tiers in a single pass (checks all thresholds for all verifications). Does not read `tier` from request body.
**Fix:** Read `tier` from request body and filter logic accordingly, or accept current approach as a valid simplification (processes all tiers per invocation, which is functionally equivalent but less granular).

### GAP-14: Missing Confirm Dialog on Approve/Reject Actions
**Spec:** Approve click → confirm dialog "Approve [Org Name]?". Reject → opens rejection reason modal.
**Current:** Approve and Reject fire mutations directly without confirmation dialogs.
**Fix:** Add confirmation dialogs/modals for Approve and Reject actions with reason textarea for Reject.

### GAP-15: Missing `FeatureErrorBoundary` Wrappers
**Standard:** All page-level components should be wrapped in `FeatureErrorBoundary`.
**Current:** Neither dashboard nor detail page has error boundaries.
**Fix:** Wrap both pages in `FeatureErrorBoundary`.

---

## Summary

| Severity | Count | Gaps |
|----------|-------|------|
| Moderate (missing spec columns/features) | 9 | GAPs 1-7, 10, 11 |
| Moderate (missing interactions) | 4 | GAPs 8, 12, 14, 9 |
| Minor (standards compliance) | 2 | GAPs 13, 15 |

**Total: 15 gaps.** Core architecture (tables, RPCs, RLS, triggers, edge functions, 3-state logic, modals) is solid. Gaps are primarily UI enrichment: missing table columns, count badges, banners, confirmation dialogs, and admin name resolution in history.

