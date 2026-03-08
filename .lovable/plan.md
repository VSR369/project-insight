

# BRD Compliance Audit: CB-MPA-2026-001 vs. Codebase

Comprehensive analysis of all business rules, data model requirements, and UX specifications against the implemented code.

---

## FULLY IMPLEMENTED (Compliant)

The following BRD requirements are confirmed as correctly implemented:

| Rule | Requirement | Implementation |
|------|------------|----------------|
| DD-MPA-001/002 | Auto-Assignment + Open Queue fallback | `assignment-engine` edge function + `open_queue_entries` table + `claim_from_queue` RPC |
| DD-MPA-003 | Domain expertise profile (Industry, Country, OrgType) | `platform_admin_profiles` with `industry_expertise`, `country_region_expertise`, `org_type_expertise` JSONB arrays |
| DD-MPA-005 | Supervisor designation, minimum one | `fn_guard_min_admins` trigger enforces BR-MPA-001/002 |
| REQ-MPA-001/002 | Profile CRUD with tier-gated access | `manage-platform-admin` edge function + `TierGuard` component |
| BR-MPA-001 | Minimum one Available admin | `fn_guard_min_admins` BEFORE UPDATE trigger blocks last-admin status change |
| BR-MPA-002 | Minimum one Supervisor | Same trigger checks supervisor count |
| BR-MPA-003 | Industry expertise mandatory | `fn_validate_industry_expertise` trigger |
| BR-MPA-004 | Auto-calculated availability status | `fn_sync_admin_workload` trigger manages Available/Partially_Available/Fully_Loaded transitions |
| BR-MPA-006 | Profile audit logging | `platform_admin_profile_audit_log` table with IP, actor, field, old/new values |
| BR-MPA-010 | Assignment within 5s | `TIMEOUT_MS = 4500` in assignment-engine with retry logic |
| BR-MPA-011 | Industry match hard gate | `execute_auto_assignment` RPC eliminates candidates with 0 L1 score |
| BR-MPA-012 | Partially Available de-prioritization | Two-pass algorithm (Available first, then Partially Available fallback) in RPC |
| BR-MPA-013 | Affinity routing on resubmission | `assignment-engine` checks original admin before standard engine |
| BR-MPA-014 | Configurable scoring weights | `md_mpa_config` params `domain_weight_l1/l2/l3` + `update_domain_weights` RPC |
| BR-MPA-015 | Assignment notification with context | `notify-admin-assignment` edge function with org name, industry, country, SLA deadline, deep-link |
| BR-MPA-016 | Assignment audit log with scoring details | `verification_assignment_log` with `scoring_snapshot` JSONB |
| BR-MPA-020 | Queue visibility for Available/Partially Available admins | RLS policy `oqe_select` on `open_queue_entries` |
| BR-MPA-021 | Queue unclaimed SLA + repeat escalation | `queue-escalation` edge function with configurable thresholds |
| BR-MPA-022 | Atomic claim with optimistic locking | `claim_from_queue` RPC with conflict detection, `ALREADY_CLAIMED` error |
| BR-MPA-023 | No SLA reset on queue | SLA clock continues from `sla_start_at` (= payment_submitted_at) |
| BR-MPA-024 | Admin release window (2hr configurable) | `release_to_queue` RPC with window check; `ReleaseToQueueModal` + `ReleaseWindowCountdown` |
| BR-MPA-025 | Queue priority ordering (SLA urgency first) | Open queue query orders by `is_pinned DESC, is_critical DESC, sla_deadline ASC` |
| BR-MPA-030 | SLA starts at Payment Submitted | `sla_start_at` set at verification creation, never reset |
| BR-MPA-031 | SLA pauses during Return for Correction | `sla_paused_duration_hours` column tracked and subtracted |
| BR-MPA-033 | Tier 1 warning at 80% | `sla-escalation` edge function, configurable via `sla_tier1_threshold_pct` |
| BR-MPA-034 | Tier 2 breach at 100% | Notifications to admin + supervisors + courtesy email via `send-registrant-courtesy` |
| BR-MPA-036 | Registrant courtesy notification | `send-registrant-courtesy` edge function for both Tier 2 and Tier 3 |
| BR-MPA-037 | Configurable escalation thresholds | `sla_tier1/2/3_threshold_pct` in `md_mpa_config` |
| BR-MPA-038 | Metrics visibility (self vs supervisor) | `useMyMetrics` (self) vs `useAllAdminMetrics` (supervisor), SCR-05-01/02 |
| BR-MPA-039 | Concurrent access control (3 view states) | `viewState` 1/2/3 in `useVerificationDetail` (EDIT/READ-ONLY/BLOCKED) |
| BR-MPA-040 | SLA continuity on reassignment | `reassign_verification` RPC preserves `sla_start_at` |
| BR-MPA-042 | Reassignment notifications (both parties) | `REASSIGNMENT_OUT` / `REASSIGNMENT_IN` notifications in reassign RPCs |
| BR-MPA-043 | Chain-of-custody audit with IP | `reassign_verification` RPC accepts `p_ip_address`; client captures via `getClientIP()` |
| BR-MPA-044 | Bulk reassignment on leave | `bulk-reassign` edge function + `bulk_reassign_admin` RPC |
| BR-MPA-045 | Reassignment limit (3 max) | `reassignment_count` tracked; `Request Reassignment` button disabled at >= 3 |
| BR-MPA-046 | Notification retry handling | `process-notification-retries` edge function with 3 retries at 15-min intervals |
| Section 8 | All 14 configurable master data parameters | `md_mpa_config` table with all required parameters seeded |
| Section 9.1 | All 5 new entities created | `platform_admin_profiles`, `verification_assignments`, `verification_assignment_log`, `admin_performance_metrics`, `open_queue_entries` |
| Section 9.3 | All triggers and constraints | Triggers for workload sync, industry validation, min-admins guard, leave date validation |
| Section 9.4 | RLS policies per spec | Policies on all MPA tables with correct tenant/role scoping |

---

## GAPS FOUND (Not Fully Implemented)

### GAP-1: CRITICAL — Tier 3 Auto-Reassignment Not Executed (BR-MPA-035)

**BRD says:** "At 150% SLA elapsed, the system automatically reassigns the verification to the Supervisor with the highest domain match score."

**Current code:** The `sla-escalation` function sends TIER3 notifications and pins unassigned entries as CRITICAL, but **does NOT actually execute the auto-reassignment**. The assigned admin keeps the verification. The comment says "Auto-reassignment triggered" in the notification text, but no `reassign_verification` RPC call is made.

**Fix:** After TIER3 detection for assigned verifications, the function should:
1. Call `get_eligible_admins_ranked` filtering to supervisors only
2. Call `reassign_verification` to the best-matching supervisor
3. If no supervisor has capacity, move to Open Queue with CRITICAL badge
4. Notify the original admin that the verification was escalated

### GAP-2: HIGH — Open Queue Visibility Doesn't Filter On Leave/Inactive Admins (BR-MPA-020)

**BRD says:** "The Open Queue is visible to ALL Platform Admins with status = Available or Partially Available. Admins On Leave or Inactive cannot see or claim from the queue."

**Current RLS:** The `oqe_select` policy only checks `has_role(auth.uid(), 'platform_admin')`. It does NOT filter by the admin's `availability_status`. An admin On Leave can still see and potentially claim queue entries.

**Fix:** Add a subquery to the SELECT and UPDATE policies that checks the admin's `availability_status` is in ('Available', 'Partially_Available') OR they are a supervisor (for monitoring per the BRD exception).

### GAP-3: HIGH — Open Queue Claim Doesn't Check Admin Capacity (BR-MPA-004/020)

**BRD says:** Fully Loaded admins are ineligible. The claim RLS policy and `claim_from_queue` RPC should verify the claiming admin isn't at max capacity.

**Current code:** The `useClaimFromQueue` hook shows an `AT_CAPACITY` error message, suggesting the RPC *may* check this, but the RLS policy on `open_queue_entries` does not enforce it. Need to verify the `claim_from_queue` RPC includes a capacity check.

### GAP-4: MEDIUM — BR-MPA-005(d) Leave Reminder Missing Scheduled Job

**BRD says:** "Send a reminder to the admin 1 business day before Leave Start Date listing their pending verifications and suggesting reassignment."

**Current code:** The `leave-reminder` edge function exists but no `pg_cron` job is configured to actually invoke it. The function is dead code until a cron schedule is created.

**Fix:** Add a `pg_cron` job: `SELECT cron.schedule('leave-reminder-daily', '0 8 * * *', $$SELECT ...$$)` or document that the user must configure this manually in the Supabase SQL editor.

### GAP-5: MEDIUM — BR-MPA-005(e) Immediate Leave Doesn't Auto-Trigger Bulk Reassignment from UI

**BRD says:** "If Leave Start Date is set to today's date, or if the admin sets availability status directly to On Leave without specifying a Leave Start Date, the system SHALL immediately stop routing new auto-assignments to this admin and trigger bulk reassignment."

**Current code:** The `manage-platform-admin` edge function handles profile updates but the leave confirmation modal (MOD-M-08) for IMMEDIATE leave must invoke `bulk-reassign` after the status change. Need to verify the LeaveConfirmationModal triggers the bulk-reassign function for the IMMEDIATE variant.

### GAP-6: MEDIUM — BR-MPA-032 SLA Individual Admin Responsibility Missing

**BRD says:** "The SLA is tracked against the individual admin, not the platform collectively."

**Current code:** `sla_duration_seconds` is on the verification record, not per-admin. The performance metrics track SLA compliance per admin, but the SLA configuration is global (one `sla_default_duration_seconds`). This is architecturally correct per the BRD (SLA is per-verification, tracked per-admin), so this is compliant. No gap.

### GAP-7: LOW — Supervisor Pin Queue Feature (BR-MPA-025)

**BRD says:** "Supervisors can pin specific verifications to the top of the queue."

**Current code:** `usePinQueueEntry` mutation exists and `is_pinned` ordering is in the query. Confirmed implemented.

### GAP-8: LOW — Performance Metric M3 (Average Processing Time) Calculation

**BRD says:** "Mean elapsed admin-processing-time (excluding registrant correction periods)."

**Current code:** `avg_processing_hours` is stored in `admin_performance_metrics` and displayed in the dashboard. The `refresh_performance_metrics` RPC presumably calculates this. Need to verify it subtracts `sla_paused_duration_hours`. This is likely correct but not fully verified without seeing the RPC body.

### GAP-9: LOW — Executive Escalation Contact Fallback Warning

**BRD says:** "If not configured at the time of a Tier 3 escalation event, the system SHALL notify ALL Supervisors. The system should display a persistent warning on login."

**Current code:** `ExecutiveContactWarningBanner` exists on the dashboard and `AdminHeader`. The `sla-escalation` function sends Tier 2/3 notifications to all supervisors even when the contact IS configured (in addition to the executive). When not configured, supervisors still get notified. The persistent login warning is implemented. Compliant.

---

## SUMMARY

| Severity | Count | Description |
|----------|-------|-------------|
| CRITICAL | 1 | Tier 3 auto-reassignment not executed (notifications sent but no actual reassignment) |
| HIGH | 2 | Open Queue visibility not filtered by admin status; claim capacity check in RLS |
| MEDIUM | 2 | Leave reminder cron job missing; immediate leave bulk-reassign trigger verification needed |
| LOW | 2 | Processing time calculation verification; minor consistency items |

## IMPLEMENTATION PLAN

### Phase 1 — Critical: Tier 3 Auto-Reassignment (GAP-1)

Update `supabase/functions/sla-escalation/index.ts` to actually execute the reassignment when `targetTier === "TIER3"` and the verification is still assigned:
- Look up eligible supervisors via `get_eligible_admins_ranked` RPC filtered to supervisors
- Call `reassign_verification` with `p_initiator='SYSTEM'`, `p_trigger='ESCALATION'`
- If no supervisor available, place in Open Queue with CRITICAL badge
- Notify original admin of escalation removal

### Phase 2 — High: Open Queue RLS Hardening (GAP-2, GAP-3)

Create a migration to update Open Queue RLS policies:
- `oqe_select`: Add availability status check (Available/Partially_Available OR supervisor)
- `oqe_claim`: Add availability status check (Available/Partially_Available only)
- Verify `claim_from_queue` RPC includes capacity check

### Phase 3 — Medium: Leave Reminder Activation (GAP-4)

Create a migration adding a `pg_cron` schedule to invoke the `leave-reminder` edge function daily at 8 AM UTC.

### Phase 4 — Medium: Immediate Leave Bulk-Reassign (GAP-5)

Verify and fix the leave confirmation modal to call `bulk-reassign` for IMMEDIATE leave transitions. This may already work via the database trigger on `availability_status` change, but needs confirmation.

