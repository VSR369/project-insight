

## MOD-02: Auto-Assignment Engine — Implementation Plan

This module is the core routing intelligence of the platform. It has NO direct admin-facing input UI -- it executes as a system process. It produces two user-visible surfaces plus backend infrastructure.

### Scope Assessment

**What MOD-02 requires (from Tech Spec + BRD):**

1. **Database tables** (5 new): `verification_assignments`, `verification_assignment_log`, `open_queue_entries`, `admin_notifications`, `notification_audit_log` (+ `notification_retry_queue`)
2. **Database RPCs** (2): `execute_auto_assignment`, `get_eligible_admins_ranked`
3. **Edge Functions** (2): `assignment-engine`, `notify-admin-assignment`
4. **UI Screens** (2): SCR-02-01 (Notification Panel -- all admins), SCR-02-02 (Engine Audit Log -- Supervisor only)
5. **React Query hooks** (2): `useAssignmentNotifications`, `useEngineAuditLog`
6. **Realtime subscription**: On `admin_notifications` table

**Current state:** Only `md_mpa_config` and `admin_performance_metrics` tables exist. No verification pipeline tables, no notification infrastructure, no assignment engine.

---

### Role-Based Access Matrix (MOD-02 specific)

| Feature | Admin (Basic) | Senior Admin | Supervisor |
|---------|--------------|--------------|------------|
| SCR-02-01: Notification Bell + Panel | Own notifications only | Own notifications only | Own + QUEUE_ESCALATION + EMAIL_FAIL types |
| SCR-02-02: Engine Audit Log | Hidden (no sidebar/route) | Hidden (no sidebar/route) | Full access with filters, export |
| Claim from Open Queue | If Available/Partially Available | If Available/Partially Available | Always visible, claim if Available/PA |
| View scoring snapshots | No | No | Yes (expanded rows in SCR-02-02) |

---

### Phase 1: Database Schema (Migration)

Create the following tables with RLS:

**1. `admin_notifications`**
- `id`, `admin_id` (FK platform_admin_profiles), `type` (TEXT: ASSIGNMENT, TIER1_WARNING, TIER2_BREACH, TIER3_CRITICAL, REASSIGNMENT_IN, REASSIGNMENT_OUT, QUEUE_ESCALATION, EMAIL_FAIL), `title`, `body`, `deep_link`, `metadata` (JSONB), `is_read` (BOOLEAN DEFAULT FALSE), `read_at`, `created_at`
- RLS: Admins SELECT/UPDATE own rows only. Supervisors can SELECT all.
- Index: `idx_notifications_admin_unread (admin_id, is_read, created_at DESC)`

**2. `verification_assignments`**
- Per BRD Section 9.1: `id`, `verification_id` (UUID), `assigned_admin_id` (FK), `assigned_at`, `assignment_method` (TEXT: AUTO_ASSIGNED, OPEN_QUEUE_CLAIMED, REASSIGNED_MANUAL, REASSIGNED_SYSTEM, AFFINITY_RESUBMISSION), `domain_match_score` (INTEGER), `scoring_details` (JSONB), `fallback_reason` (TEXT), `released_at`, `release_reason`, `is_current` (BOOLEAN DEFAULT TRUE), `created_at`
- RLS: Assigned admin reads own. Supervisors read all. System inserts via SECURITY DEFINER.

**3. `verification_assignment_log`**
- Per BRD: `id`, `verification_id`, `event_type` (TEXT), `from_admin_id`, `to_admin_id`, `reason`, `initiator` (TEXT: SYSTEM, ADMIN, SUPERVISOR), `scoring_snapshot` (JSONB), `created_at`
- RLS: Supervisors SELECT only. No client-side INSERT (system writes via SECURITY DEFINER).

**4. `open_queue_entries`**
- Per BRD: `id`, `verification_id` (UNIQUE), `fallback_reason` (TEXT), `entered_at`, `sla_deadline`, `is_critical` (BOOLEAN DEFAULT FALSE), `is_pinned` (BOOLEAN DEFAULT FALSE), `claimed_by` (FK), `claimed_at`, `escalation_count` (INTEGER DEFAULT 0), `last_escalated_at`, `created_at`
- RLS: Available/Partially Available admins can SELECT. Supervisors always see. Claim (UPDATE claimed_by) by Available/PA admins only.

**5. `notification_audit_log`**
- `id`, `notification_type`, `recipient_id`, `recipient_email`, `verification_id`, `status` (TEXT: PENDING, SENT, FAILED), `email_retry_count` (INTEGER DEFAULT 0), `last_retry_at`, `sms_status`, `created_at`

**6. Update `md_mpa_config`** — add missing params: `sla_duration`, `queue_unclaimed_sla`, `queue_escalation_repeat_interval`, `admin_release_window`, `tier1_threshold`, `tier2_threshold`, `tier3_threshold`, `max_reassignments`, `partially_available_threshold`

---

### Phase 2: Database Functions (RPCs)

**1. `execute_auto_assignment(p_verification_id, p_industry_segments, p_hq_country, p_org_type)`**
- 5-step algorithm per tech spec: Eligibility filter -> Domain scoring (two-pass per BR-MPA-012) -> Workload tiebreaker -> Priority tiebreaker -> Assign or fallback
- Reads weights from `md_mpa_config` dynamically (BR-MPA-014)
- Writes to `verification_assignments`, `verification_assignment_log`, `open_queue_entries`
- Uses `FOR UPDATE NOWAIT` for concurrent safety
- SECURITY DEFINER

**2. `get_eligible_admins_ranked(p_industry_segments, p_hq_country, p_org_type, p_exclude_admin_id)`**
- Read-only preview of the scoring algorithm (for MOD-06 reassignment UI later)
- SECURITY DEFINER, STABLE

---

### Phase 3: Edge Functions

**1. `assignment-engine`**
- Triggered on payment_submitted or resubmission events
- BR-MPA-013: Affinity routing check before standard engine
- 4.5s timeout guard (BR-MPA-010)
- MAX_RETRIES=2 on concurrent conflict (55P03)
- Calls `execute_auto_assignment` RPC, then `notify-admin-assignment`

**2. `notify-admin-assignment`**
- Inserts into `admin_notifications` (in-app, immediate)
- Inserts into `notification_audit_log`
- Email sending with BR-MPA-046 retry logic (3 attempts x 15min)
- SMS fire-and-forget

---

### Phase 4: UI — SCR-02-01 Assignment Notification Panel (All Tiers)

**Bell icon in AdminHeader** with unread badge count. Click opens slide-in drawer (right side).

**Components:**
- `src/components/admin/notifications/NotificationBell.tsx` — Bell icon + badge (0, 1-9, 9+)
- `src/components/admin/notifications/NotificationDrawer.tsx` — Sheet/drawer with notification list
- `src/components/admin/notifications/NotificationCard.tsx` — Type-specific card with colored left border
- `src/hooks/queries/useAdminNotifications.ts` — React Query + Supabase Realtime subscription

**Notification card types with accent colors:**
| Type | Border Color | Icon | Visible To |
|------|-------------|------|------------|
| ASSIGNMENT | Blue | Clipboard | All admins |
| TIER1_WARNING | Amber | Warning | All admins |
| TIER2_BREACH | Red | Circle | All admins |
| TIER3_CRITICAL | Dark Red | Alert | All admins |
| REASSIGNMENT_IN | Purple | ArrowLeft | All admins |
| REASSIGNMENT_OUT | Grey | ArrowRight | All admins |
| QUEUE_ESCALATION | Orange | Megaphone | Supervisors only |
| EMAIL_FAIL | Red outline | Mail | Supervisors only |

**Tier-based filtering:**
- Basic Admin / Senior Admin: See own notifications (types: ASSIGNMENT, TIER1_WARNING, TIER2_BREACH, TIER3_CRITICAL, REASSIGNMENT_IN, REASSIGNMENT_OUT)
- Supervisor: All own notifications + QUEUE_ESCALATION + EMAIL_FAIL

**Features:** Mark all read, empty state, paginated (20 per page), real-time via Supabase Realtime channel

---

### Phase 5: UI — SCR-02-02 Engine Audit Log (Supervisor Only)

**Route:** `/admin/assignment-audit-log`
**Access:** Supervisor tier only (TierGuard with `requiredTier='supervisor'`)
**Sidebar:** Added under Team Management group, visible to Supervisors only

**Components:**
- `src/pages/admin/AssignmentAuditLogPage.tsx`
- `src/components/admin/assignment-audit/AuditLogTable.tsx` — TanStack Table with expandable rows
- `src/components/admin/assignment-audit/ScoringSnapshotPanel.tsx` — Expanded row detail
- `src/hooks/queries/useEngineAuditLog.ts`

**Filters:** Date range (default last 7 days), Admin dropdown, Outcome (All/Assigned/Fallback)

**Table columns:** Date/Time, Org Name, Outcome badge (Assigned green / Fallback amber / Timeout red), Assigned To, Domain Score (number + bar), Selection Reason (badge), Pool Size, Fallback Reason

**Expandable row:** Shows scoring snapshot — all candidates with L1/L2/L3 scores, workload ratios, priority. Winner highlighted green. L1=0 rows in red.

**Export CSV** button for filtered results.

---

### Phase 6: Sidebar + Route Integration

- Add "Assignment Audit Log" to Team Management section (Supervisor only)
- Add route `/admin/assignment-audit-log` with `TierGuard requiredTier='supervisor'`
- Integrate `NotificationBell` into `AdminHeader.tsx` (all tiers)

---

### Files Created/Modified

| File | Action |
|------|--------|
| Migration SQL | New tables, RPCs, RLS, indexes |
| `supabase/functions/assignment-engine/index.ts` | New edge function |
| `supabase/functions/notify-admin-assignment/index.ts` | New edge function |
| `src/components/admin/notifications/NotificationBell.tsx` | New |
| `src/components/admin/notifications/NotificationDrawer.tsx` | New |
| `src/components/admin/notifications/NotificationCard.tsx` | New |
| `src/hooks/queries/useAdminNotifications.ts` | New |
| `src/pages/admin/AssignmentAuditLogPage.tsx` | New |
| `src/components/admin/assignment-audit/AuditLogTable.tsx` | New |
| `src/components/admin/assignment-audit/ScoringSnapshotPanel.tsx` | New |
| `src/hooks/queries/useEngineAuditLog.ts` | New |
| `src/components/admin/AdminHeader.tsx` | Modified — add NotificationBell |
| `src/components/admin/AdminSidebar.tsx` | Modified — add Audit Log link (Supervisor) |
| Route config | Modified — add audit log route |

---

### Implementation Order

Due to the size of this module, I recommend implementing in 3 batches:

**Batch 1:** Database schema (all tables + RPCs + RLS + indexes) + `md_mpa_config` seed data
**Batch 2:** Edge functions (`assignment-engine` + `notify-admin-assignment`)
**Batch 3:** UI screens (NotificationBell/Drawer for all tiers + Audit Log page for Supervisors)

This ensures the backend is solid before wiring up the frontend, and role separation is enforced at every layer.

