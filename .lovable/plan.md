

# MOD-06 Gap Analysis: Tech Spec vs Implementation

## Verified as Complete
- TABLE-06-01: `reassignment_requests` table, indexes, RLS (4 policies), validation trigger
- API-06-01: `reassign_verification` RPC with BR-MPA-040 (sla_start_at untouched), BR-MPA-045 (limit blocks ADMIN only)
- API-06-02: `bulk_reassign_admin` RPC with Under_Verification filter (BR-MPA-044)
- Updated `request_reassignment` RPC to INSERT into `reassignment_requests` + notify supervisors
- SCR-06-01: `ReassignmentInboxPage` with tabs, sorting, At-Risk filter, realtime
- `ReassignmentRequestCard`: tier badges, SLA bar, truncated reason, "Read more", suggested admin, near-limit warning, Assign/Decline actions
- MOD-M-04: `SupervisorReassignModal` with eligible admins table, queue checkbox, reason validation
- MOD-M-05: `BulkReassignConfirmModal` with preview table, info box, breach warning
- SCR-06-02: `AssignedStateBanner` STATE 2 with Force Reassign + Reassign to Me + Fully Loaded guard
- `bulk-reassign` Edge Function with departing admin notification, per-receiver grouped notifications, supervisor queue escalation
- Route `/admin/reassignments` with TierGuard
- Sidebar with "Reassignments" badge (supervisor only)
- All hooks: `useReassignmentRequests`, `useReassignVerification`, `useBulkReassignPreview`, `useEligibleAdmins`

---

## Identified Gaps

### GAP-1: Missing `on_admin_leave` DB Trigger (API-06-04) — CRITICAL

The `fn_trigger_bulk_reassign` trigger function and `on_admin_leave` trigger on `platform_admin_profiles` were specified in the plan but **never created** in the migration. The entire automated bulk reassignment path (BR-MPA-044) relies on this trigger to fire the `bulk-reassign` edge function asynchronously via `pg_net`.

**Impact**: Without this trigger, going On_Leave/Inactive does NOT automatically reassign verifications unless MOD-M-05 is explicitly used. The DB-level automatic path is broken.

**Fix**: Create migration with `fn_trigger_bulk_reassign()` + `CREATE TRIGGER on_admin_leave AFTER UPDATE OF availability_status ON platform_admin_profiles`.

### GAP-2: Missing `place_in_open_queue` RPC (Gate 12 in Completion Checklist)

The tech spec (page 16, §5.1) specifies that when `forceToQueue` is true in `useReassignVerification`, it should call `supabase.rpc('place_in_open_queue', ...)`. This RPC does not exist anywhere in the codebase. The current `useReassignVerification` hook passes `toAdminId: null` to `reassign_verification` which handles queue placement inline, but the spec explicitly defines a separate `place_in_open_queue` RPC stub for the Force-to-Queue path in MOD-M-04.

**Impact**: Low — the current `reassign_verification` RPC handles null `p_to_admin_id` and places in queue. However, spec compliance requires the separate RPC for cleaner separation (the queue path should NOT call `reassign_verification` per EC-06-11, to avoid limit checks).

**Fix**: Create `place_in_open_queue` RPC stub and update `useReassignVerification` to call it when `toAdminId` is null.

### GAP-3: `reassign_verification` RPC Missing `p_ip_address` Parameter

The spec defines `p_ip_address TEXT DEFAULT NULL` as a parameter for BR-MPA-043 audit logging. The implemented RPC does **not** accept this parameter. The audit log entry does not include IP address information.

**Impact**: BR-MPA-043 partial non-compliance — IP address not captured in chain-of-custody audit.

**Fix**: Add `p_ip_address TEXT DEFAULT NULL` parameter to the RPC and append `[IP: x.x.x.x]` to the reason in the audit log entry.

### GAP-4: `useReassignVerification` Hook Missing IP Capture (BR-MPA-043)

The spec (page 16) shows `p_ip_address: await getClientIP()`. The current hook does not capture or pass client IP.

**Fix**: Add `getClientIP()` utility (e.g. via `https://api.ipify.org`) and pass to RPC.

### GAP-5: Decline Does Not Notify Requesting Admin (TC-06-013)

The spec and TC-06-013 require: "On confirm [decline]: status=DECLINED. Requesting admin gets in-app notification." The `useDeclineReassignment` mutation only updates the `reassignment_requests` row status. It does **not** create an `admin_notifications` entry for the requesting admin.

**Fix**: After updating status to DECLINED, insert a notification to the requesting admin's `admin_id` with type `REASSIGNMENT_DECLINED`.

### GAP-6: MOD-M-05 Not Wired to Any Entry Point

`BulkReassignConfirmModal` is built but **never imported or rendered** anywhere in the app. The spec defines two entry points:
1. SCR-01-06 Availability Change dialog when target status = On_Leave or Inactive
2. SCR-05-03 "Reassign All Pending" Supervisor action

Neither integration exists. The modal is orphaned.

**Fix**: Wire into the availability change flow (wherever admin status is changed) and the Admin Detail page's "Reassign All Pending" button.

### GAP-7: `SupervisorReassignModal` Missing Org Context on Force Reassign

When opened from `VerificationDetailPage` (line 180-185), the modal receives only `verificationId` and `orgName`. It does NOT receive `hqCountry`, `industrySegments`, `orgType`, `currentAdminId`, or `reassignmentCount` — all needed to call `get_eligible_admins_ranked` with proper domain matching and to show the near-limit warning.

**Impact**: The eligible admins table loads with empty params, returning no results or unfiltered results. The near-limit warning never shows.

**Fix**: Pass org context from `verification.organization` and `verification.reassignment_count` to the modal props.

### GAP-8: `SupervisorReassignModal` Missing Current Admin Info Row

The spec (page 15) requires: "CURRENT ADMIN ROW (grey bg): Currently assigned to [Admin Name] · [availability] · [N] pending". This row is not rendered in the modal.

**Fix**: Add a grey-bg info row showing the current admin's name, availability status, and pending count.

### GAP-9: `SupervisorReassignModal` Missing Org Summary Details

The spec requires the org summary card to show: "Industry chips, HQ Country, Tier badge, compact SLA elapsed bar." Current implementation shows only `orgName` in a grey card.

**Fix**: Pass and render industry chips, HQ country flag, tier badge, and compact SLA bar in the org summary card.

### GAP-10: `bulk_reassign_admin` RPC Missing `p_skip_admin_id` in Auto-Assignment Call

The spec (page 7) explicitly passes `p_skip_admin_id := p_departing_admin_id` to `execute_auto_assignment` to exclude the departing admin from candidates. The current implementation calls `execute_auto_assignment(v_rec.verification_id)` with only the verification_id — the departing admin may be re-selected.

**Fix**: Pass `p_departing_admin_id` as the skip parameter to `execute_auto_assignment`.

### GAP-11: `bulk_reassign_admin` RPC Missing Assignment Method Override

The spec (page 7) requires overriding `assignment_method` to `REASSIGNED_SYSTEM` on both `verification_assignments` and `verification_assignment_log` after each successful auto-assignment. The current implementation does not do this override.

**Fix**: After each successful auto-assignment, UPDATE the latest `verification_assignments` and `verification_assignment_log` rows to set `assignment_method = 'REASSIGNED_SYSTEM'` and `event_type = 'REASSIGNED'`.

### GAP-12: `reassign_verification` RPC Missing `max_reassignments` Config Lookup

The spec reads `max_reassignments` from `md_mpa_config` table: `SELECT COALESCE(param_value::INTEGER, 3) INTO v_max_reassign FROM md_mpa_config WHERE param_key = 'max_reassignments_per_verification'`. Current implementation hardcodes `v_max_reassignments INT := 3`.

**Fix**: Query `md_mpa_config` for the configurable value with fallback to 3.

### GAP-13: `bulk-reassign` Edge Function Missing `sendBatchReassignmentEmail` and Supervisor Filter

The spec (page 9) calls `sendBatchReassignmentEmail()` for each receiving admin (BR-MPA-046 retry engine). Not implemented. Also, the supervisor query uses `eq('admin_tier', 'supervisor')` but the spec uses `eq('is_supervisor', true)` — this depends on the actual column used.

**Impact**: Low — email delivery via retry engine is a MOD-04 integration. The supervisor filter discrepancy may cause missed notifications if the column name differs.

---

## Summary Table

| Gap | Severity | Area | Description |
|-----|----------|------|-------------|
| GAP-1 | CRITICAL | DB | Missing `on_admin_leave` trigger (API-06-04) |
| GAP-2 | Medium | DB | Missing `place_in_open_queue` RPC (Gate 12) |
| GAP-3 | High | DB | `reassign_verification` missing `p_ip_address` param (BR-MPA-043) |
| GAP-4 | High | Hook | `useReassignVerification` not capturing client IP |
| GAP-5 | High | Hook | Decline does not notify requesting admin (TC-06-013) |
| GAP-6 | High | UI | `BulkReassignConfirmModal` not wired to any entry point |
| GAP-7 | High | UI | Force Reassign modal missing org context props |
| GAP-8 | Medium | UI | Modal missing "Current Admin" info row |
| GAP-9 | Medium | UI | Modal missing org summary details (industry, country, SLA bar) |
| GAP-10 | High | DB | `bulk_reassign_admin` not passing `p_skip_admin_id` |
| GAP-11 | Medium | DB | `bulk_reassign_admin` not overriding assignment_method |
| GAP-12 | Medium | DB | `reassign_verification` hardcodes max instead of config lookup |
| GAP-13 | Low | Edge Fn | Missing email function call + supervisor filter check |

## Implementation Plan

### Phase 1: Database Migration
- Create `fn_trigger_bulk_reassign` + `on_admin_leave` trigger (GAP-1)
- Add `p_ip_address` to `reassign_verification`, append to audit reason (GAP-3)
- Add `md_mpa_config` lookup for max_reassignments (GAP-12)
- Create `place_in_open_queue` RPC stub (GAP-2)
- Fix `bulk_reassign_admin` to pass `p_skip_admin_id` and override assignment_method (GAP-10, GAP-11)

### Phase 2: Hooks
- Add `getClientIP()` utility and pass in `useReassignVerification` (GAP-4)
- Add requesting admin notification in `useDeclineReassignment` (GAP-5)

### Phase 3: UI Components
- Wire `BulkReassignConfirmModal` to availability change flow (GAP-6)
- Pass full org context + reassignment count to `SupervisorReassignModal` from `VerificationDetailPage` (GAP-7)
- Add current admin info row to `SupervisorReassignModal` (GAP-8)
- Add industry chips, HQ country, tier badge, SLA bar to modal org summary (GAP-9)

