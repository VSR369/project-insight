

# Plan: MOD-06 — Reassignment Workflow

## Current State

**Already Exists:**
- `request_reassignment` RPC — logs to `verification_assignment_log` + notifies supervisors (basic, no inbox table)
- `supervisor_reassign_to_self` RPC — supervisor claims a verification
- `RequestReassignmentModal` (MOD-M-03) — admin submits reason, calls `request_reassignment`
- `AssignedStateBanner` with "Reassign to Me" for STATE 2 supervisors
- `VerificationActionBar` with "Request Reassignment" button
- `get_eligible_admins_ranked` RPC — returns ranked admin list with domain scores
- `execute_auto_assignment` RPC — auto-assigns based on domain routing
- `notify-admin-assignment` edge function — sends ASSIGNMENT/REASSIGNMENT notifications
- `admin_notifications` table — stores in-app notifications
- `verification_assignment_log` — audit trail

**Does NOT Exist (MOD-06 deliverables):**
- `reassignment_requests` table (TABLE-06-01) — PENDING inbox for supervisor actioning
- `reassign_verification` RPC (API-06-01) — atomic single-verification reassignment with BR-MPA-040–045 enforcement
- `bulk_reassign_admin` RPC (API-06-02) — batch reassignment loop
- `fn_trigger_bulk_reassign` trigger + `on_admin_leave` (API-06-04) — auto-fires on On_Leave/Inactive
- `bulk-reassign` edge function (API-06-03) — orchestrates batch + notifications
- SCR-06-01: Reassignment Requests Inbox page
- MOD-M-04: Supervisor Reassign Modal
- MOD-M-05: Bulk Reassign Confirmation Modal
- SCR-06-02: "Force Reassign" button on STATE 2 action bar
- React Query hooks: `useReassignmentRequests`, `useReassignVerification`, `useBulkReassignPreview`
- Route: `/admin/reassignments`

---

## Implementation Plan

### Phase 1: Database Migration

**New table `reassignment_requests`:**
```
id, verification_id, requesting_admin_id, suggested_admin_id,
reason (CHECK >= 20 chars), status (PENDING/APPROVED/DECLINED),
actioned_by_id, actioned_at, decline_reason (CHECK >= 20 chars), created_at
```
- Indexes: `idx_rr_pending` (partial on PENDING), `idx_rr_verif`
- RLS: 4 policies (sup_select, own_select, own_insert, sup_update)

**New RPC `reassign_verification`** (SECURITY DEFINER):
- Params: `p_verification_id, p_to_admin_id, p_reason, p_initiator (ADMIN|SUPERVISOR|SYSTEM), p_trigger (MANUAL|LEAVE|DEACTIVATION|ESCALATION|ADMIN_REQUEST), p_requesting_admin, p_supervisor_id, p_ip_address`
- Steps: FOR UPDATE lock → BR-MPA-045 limit check (blocks ADMIN only) → UPDATE `platform_admin_verifications` (sla_start_at NOT touched, BR-MPA-040) → close old assignment → open new assignment → audit log with IP (BR-MPA-043)
- Returns: `{success, from_admin_id, to_admin_id}`

**New RPC `bulk_reassign_admin`** (SECURITY DEFINER):
- Params: `p_departing_admin_id, p_trigger (LEAVE|DEACTIVATION)`
- Loops over `Under_Verification` only (excludes `Returned_for_Correction`, BR-MPA-031/044)
- Calls `execute_auto_assignment` per verification with `p_skip_admin_id`
- Overrides assignment_method to `REASSIGNED_SYSTEM`
- Returns: `{total, assigned, queued, results[]}`

**New trigger `on_admin_leave`:**
- AFTER UPDATE on `platform_admin_profiles.availability_status`
- Fires only on fresh transition INTO On_Leave/Inactive (idempotent, EC-06-10)
- Uses `pg_net.http_post` to call `bulk-reassign` edge function async

**Update `request_reassignment` RPC:**
- Now INSERTs into `reassignment_requests` table instead of just logging
- Still notifies supervisors, but creates proper PENDING record

### Phase 2: Edge Function — `bulk-reassign`

- Receives `{departing_admin_id, trigger}` from DB trigger
- Calls `bulk_reassign_admin` RPC via service_role
- BR-MPA-044 notifications:
  - Departing admin: REASSIGNMENT_OUT batch summary
  - Each receiving admin: grouped REASSIGNMENT_IN with org names
  - Supervisors: QUEUE_ESCALATION if any went to Open Queue

### Phase 3: SCR-06-01 — Reassignment Requests Inbox

**Route:** `/admin/reassignments` — Supervisor only

**Components:**
- `ReassignmentInboxPage.tsx` — H1 "Reassignment Requests" + "(N pending)" subtext
- Tabs: PENDING (default) / APPROVED / DECLINED
- Filter toggle: All / At-Risk only (sla_breach_tier check)
- Sort: SLA urgency (breach tier DESC, then elapsed % DESC, same-tier by created_at ASC)

**Request Card elements (per Figma prompt):**
- Org name (bold, clickable → SCR-03-03) + Tier badge (⚠T1 amber / 🔴T2 red / 🚨T3 dark-red)
- Requesting admin name + availability pill
- Reason truncated (80 chars) + "Read more" toggle
- Suggested target (grey italic, if set)
- Compact SLA bar (120px) + time remaining/breached text
- Amber strip at bottom if `reassignment_count = max - 1` (BR-MPA-045)
- "Assign →" blue button → opens MOD-M-04
- "Decline" grey button → inline textarea (min 20 chars) + "Confirm Decline" red button

**Realtime:** Supabase channel on `reassignment_requests` INSERT → invalidates cache

**Hook:** `useReassignmentRequests(status)` — joins verifications, orgs, requesting admin, suggested admin

**Sidebar:** Add "Reassignments" entry with pending count badge (supervisor only)

### Phase 4: MOD-M-04 — Supervisor Reassign Modal

**Entry points:** "Assign →" on SCR-06-01 cards, "Force Reassign" on SCR-06-02 STATE 2 bar

**UI elements (per Figma prompt):**
- Modal 560px wide, "Reassign Verification"
- Org summary card: name, industry chips, HQ country, tier badge, compact SLA bar
- Current admin row (grey bg): name, availability, pending count
- Reason textarea (min 20 chars), with admin's original reason shown as reference if from inbox
- Last-reassignment warning (amber, conditional on count = max - 1)
- Eligible admins table (from `get_eligible_admins_ranked`): Name, Availability, Total Score, L1/L2/L3 breakdown, Workload bar, Priority. Fully Loaded rows: radio disabled, red pill
- "Place in Open Queue instead" checkbox → disables admin table
- Zero eligible state: amber warning
- "Confirm Reassign" button — disabled until admin selected OR queue checked AND reason >= 20 chars

**Hook:** `useReassignVerification()` — calls `reassign_verification` RPC, marks `reassignment_requests.status = APPROVED` if from inbox, fires `notify-admin-assignment` for BR-MPA-042

### Phase 5: MOD-M-05 — Bulk Reassign Confirmation Modal

**Entry points:** Availability change to On_Leave/Inactive, SCR-05-03 "Reassign All Pending"

**UI elements (per Figma prompt):**
- Modal 520px, "Setting Status to On Leave — Review Pending Verifications"
- Bold: "You have [N] verifications currently assigned. All will be automatically reassigned."
- Preview table: Org Name, Industry chips, compact SLA bar, Tier badge (Under_Verification only)
- Blue info box: "Each verification will be processed through the Auto-Assignment Engine independently..."
- Red warning (conditional): "⚠ [N] of your verifications have active SLA breaches..."
- Leave dates (read-only) if set
- "Confirm & Go On Leave" red button → UPDATE availability_status, toast.success, modal closes
- Cancel button

**Hook:** `useBulkReassignPreview(adminId)` — fetches Under_Verification verifications for the admin

### Phase 6: SCR-06-02 Extensions

Add to existing `AssignedStateBanner` (STATE 2) and `VerificationActionBar`:
- "Force Reassign" button in STATE 2 → opens MOD-M-04
- "Reassign to Me" inline confirm: existing flow, but add Fully Loaded guard (EC-06-09: disabled + tooltip)

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | `reassignment_requests` table, `reassign_verification` RPC, `bulk_reassign_admin` RPC, `fn_trigger_bulk_reassign` trigger, RLS, update `request_reassignment` |
| `supabase/functions/bulk-reassign/index.ts` | Edge function for batch reassignment + notifications |
| `src/pages/admin/reassignments/ReassignmentInboxPage.tsx` | SCR-06-01 |
| `src/components/admin/reassignments/ReassignmentRequestCard.tsx` | Request card with all elements |
| `src/components/admin/reassignments/SupervisorReassignModal.tsx` | MOD-M-04 |
| `src/components/admin/reassignments/BulkReassignConfirmModal.tsx` | MOD-M-05 |
| `src/components/admin/reassignments/EligibleAdminsTable.tsx` | Ranked admins table for MOD-M-04 |
| `src/components/admin/reassignments/DeclineReasonInline.tsx` | Inline decline UI |
| `src/hooks/queries/useReassignmentRequests.ts` | Query + realtime hook |
| `src/hooks/queries/useReassignVerification.ts` | Mutation hook |
| `src/hooks/queries/useBulkReassignPreview.ts` | Preview query |
| `src/hooks/queries/useEligibleAdmins.ts` | Wrapper for `get_eligible_admins_ranked` |

## Files to Modify

| File | Changes |
|------|---------|
| `src/App.tsx` | Add lazy route `/admin/reassignments` with TierGuard supervisor |
| `src/components/admin/AdminSidebar.tsx` | Add "Reassignments" with badge in Verification group |
| `src/components/admin/verifications/AssignedStateBanner.tsx` | Add "Force Reassign" button for STATE 2, Fully Loaded guard on "Reassign to Me" |
| `src/components/admin/verifications/VerificationActionBar.tsx` | No changes needed (already has Request Reassignment) |
| `src/pages/admin/verifications/VerificationDetailPage.tsx` | Pass org context for Force Reassign modal |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

## Business Rules Cross-Reference

| BR | Enforcement |
|----|------------|
| BR-MPA-040 | `reassign_verification` never touches `sla_start_at` |
| BR-MPA-041 | No data migration — SCR-03-03 tabs read by `verification_id` |
| BR-MPA-042 | `useReassignVerification` calls `notify-admin-assignment` twice (IN + OUT) |
| BR-MPA-043 | `reassign_verification` appends IP to audit log reason |
| BR-MPA-044 | `bulk_reassign_admin` + `bulk-reassign` edge fn + `on_admin_leave` trigger |
| BR-MPA-045 | `reassign_verification` limit check blocks ADMIN, allows SUPERVISOR/SYSTEM |

