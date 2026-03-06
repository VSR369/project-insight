

# MOD-02 Gap Analysis: Tech Spec & BRD vs Current Implementation

## Summary

The current implementation covers the structural foundation (tables, RPCs, edge functions, UI screens) but has significant functional gaps against the canonical specs. Below are all identified gaps organized by severity.

---

## Critical Gaps (Algorithm & Business Rule Violations)

### GAP-1: BR-MPA-012 Two-Pass Engine Missing
**Spec:** Pass 1 scores Available-only admins. Only if no Available admin has L1>0, run Pass 2 including Partially Available.
**Current:** Single-pass query includes both Available and Partially Available together. No two-pass logic exists.
**Fix:** Rewrite `execute_auto_assignment` RPC with explicit two-pass CTE structure per the spec's canonical SQL.

### GAP-2: L2/L3 Wildcard Partial Scoring Missing
**Spec:** Empty `country_expertise` = wildcard = half points (15/30). Empty `org_type_expertise` = wildcard = half points (10/20).
**Current:** L2 is binary (full or 0). L3 is binary (full or 0). No wildcard/partial scoring.
**Fix:** Add CASE WHEN for empty arrays giving half-weight scores in both RPCs.

### GAP-3: L1 Weight Defaults Wrong (50 not 40)
**Spec:** L1=50, L2=30, L3=20 (sum=100). Config keys: `domain_weight_l1`, `domain_weight_l2`, `domain_weight_l3`.
**Current:** Defaults hardcoded as 40/30/30 with keys `weight_industry_match`, `weight_country_match`, `weight_org_type_match`.
**Fix:** Update defaults to 50/30/20 and align config param_key names with spec.

### GAP-4: Round-Robin Tiebreaker Missing
**Spec:** Step 4b: If priority tied, oldest `last_assignment_timestamp` wins (round-robin).
**Current:** Uses `random()` as final tiebreaker instead of `last_assignment_timestamp ASC`.
**Fix:** Replace `random()` with `last_assignment_timestamp ASC NULLS FIRST` in ORDER BY.

### GAP-5: Selection Reason Not Captured
**Spec:** Audit log must record selection_reason: `highest_domain_score`, `workload_tiebreaker`, `priority_tiebreaker`, `round_robin`.
**Current:** Reason is hardcoded as "Standard engine assignment". No selection reason derivation logic.
**Fix:** Add reason derivation logic (check tie counts at each level) per spec SQL.

### GAP-6: Full Candidate Snapshot Not Logged (BR-MPA-016)
**Spec:** `scoring_snapshot` must contain JSONB array of ALL candidates with L1/L2/L3 scores, workload ratios, priority.
**Current:** Snapshot only contains the winner's scores. No candidate array.
**Fix:** Aggregate all candidates into a JSONB array before selecting the winner, store in `scoring_snapshot`.

---

## Moderate Gaps (Missing Features)

### GAP-7: `notification_retry_queue` Table Missing
**Spec:** BR-MPA-046 requires a `notification_retry_queue` table for deferred email retries (3 attempts x 15min).
**Current:** Only a placeholder comment in `notify-admin-assignment`. No retry table or mechanism.
**Fix:** Create `notification_retry_queue` table with `notification_audit_log_id`, `max_attempts`, `retry_count`, `next_retry_at`.

### GAP-8: Notification Content Missing BR-MPA-015 Required Fields
**Spec:** ASSIGNMENT notification must include: org name, Industry Segments, HQ Country, Org Type, Subscription Tier, SLA deadline, deep-link to `/admin/verifications/:id`.
**Current:** Notification body is generic (`Verification {id}... has been assigned to you`). Deep link goes to `/admin/platform-admins` (wrong). No org context fetched.
**Fix:** Fetch verification + organization details in `notify-admin-assignment`, build rich notification body, set deep_link to `/admin/verifications/${verification_id}`.

### GAP-9: NotificationCard Missing Rich Content per Spec
**Spec:** ASSIGNMENT card must show: org name (bold), industry chips, HQ Country (flag+name), Org Type, Subscription Tier badge, SLA deadline with clock icon, domain score badge, "View Verification" CTA button.
**Current:** Card shows only title, body text, and relative timestamp. No structured content rendering from metadata.
**Fix:** Parse `notification.metadata` to render org details, industry chips, SLA deadline, and a proper CTA button.

### GAP-10: No "Load More" Pagination in NotificationDrawer
**Spec:** "Load more" button at bottom when >20 notifications. Paginated 20 per fetch.
**Current:** Single fetch of 20 with no pagination/load-more.
**Fix:** Add cursor-based or offset pagination with a "Load more" button.

### GAP-11: No Toast on Real-Time Notification Arrival
**Spec:** New notification arrival triggers `toast.info` ("New verification assigned: [Org Name]") for 4 seconds.
**Current:** Realtime subscription only invalidates queries. No toast shown.
**Fix:** In `useNotificationRealtime`, show toast on INSERT event with org name from payload.

### GAP-12: `get_eligible_admins_ranked` Missing Fields vs Spec
**Spec:** Return table should include: `email`, `availability_status`, `current_active`, `max_concurrent`, `is_supervisor`.
**Current:** Returns only `admin_id`, `full_name`, `admin_tier`, scores, `workload_ratio`, `assignment_priority`. Missing fields needed for MOD-06 reassignment UI.
**Fix:** Add missing columns to the return type.

### GAP-13: Scoring Snapshot Panel Missing Per-Candidate Breakdown
**Spec (SCR-02-02 Section 2.2):** Expanded row shows ALL candidates with L1/L2/L3 individual scores, workload ratios, priority, and outcome badges (WINNER green / Eliminated-L1=0 red / Runner-up grey).
**Current:** Panel shows only aggregate scores (industry_score, country_score, org_type_score) for the winner. No candidate list table.
**Fix:** Render the full `scoring_details` JSONB array as a mini-table with per-candidate rows, color-coded scores, and outcome badges.

### GAP-14: Audit Log Missing "Selection Reason" Column
**Spec:** Table columns include "Selection Reason" with badges: `highest_domain_score` / `workload_tiebreaker` / `priority_tiebreaker` / `round_robin` / `NO_ELIGIBLE_ADMIN` / `NO_INDUSTRY_MATCH`.
**Current:** Shows only "Method" badge from snapshot. No selection reason column.
**Fix:** Add Selection Reason column reading from `log.reason` field with color-coded badges.

### GAP-15: Audit Log Missing "Org Name" Column
**Spec:** Table should show "Org Name (link)" column.
**Current:** Shows only Verification ID (truncated). No org name.
**Fix:** Join/lookup org name from verification data or snapshot metadata.

---

## Minor Gaps

### GAP-16: `last_assignment_timestamp` Column Not Updated
**Spec:** On assignment, update `last_assignment_timestamp = NOW()` on admin profile.
**Current:** RPC updates `current_workload` but not `last_assignment_timestamp`. Field may not exist on table.
**Fix:** Add column if missing, update in RPC.

### GAP-17: Fallback Reason Enum Values
**Spec:** Distinct fallback reasons: `NO_ELIGIBLE_ADMIN`, `NO_INDUSTRY_MATCH`, `REASSIGNMENT_OVERFLOW`, `ADMIN_RELEASED`.
**Current:** Fallback reason is free text "No eligible admin found with matching industry expertise".
**Fix:** Use spec-defined enum values as CHECK constraint.

### GAP-18: Admin Header Tier Badge Not Showing Actual Tier
**Current:** Always shows "Platform Admin" regardless of tier.
**Fix:** Show actual tier (Supervisor / Senior Admin / Admin) in the header badge.

### GAP-19: `assignment-engine` Edge Function Missing Verification Context Fetch
**Spec:** Edge function should fetch verification details (industry_segments, hq_country, org_type) from `platform_admin_verifications` table.
**Current:** Expects these as request body params. No verification table lookup.
**Note:** This is acceptable if the caller provides the data, but the spec expects self-contained lookup.

---

## Implementation Priority

**Phase 1 (Critical - Algorithm correctness):** GAPs 1-6 -- Fix the RPC algorithm
**Phase 2 (Moderate - Feature completeness):** GAPs 7-15 -- Notification content, UI enrichment, audit log
**Phase 3 (Minor - Polish):** GAPs 16-19 -- Column updates, enum values, header badge

Estimated scope: ~8-10 files modified, 1 new migration, 1 new table.

