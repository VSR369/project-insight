# Platform Admin Sub-Role Tiers — Implementation Complete

## What Was Implemented

### Database
- Added `admin_tier` column to `platform_admin_profiles` (supervisor, senior_admin, admin)
- Added `admin_tier` column to `admin_access_codes` (tier-specific codes)
- Migrated existing `is_supervisor = true` → `admin_tier = 'supervisor'`
- Added `fn_guard_tier_hierarchy` trigger (prevents demoting last supervisor)
- Added index `idx_pap_admin_tier`

### Edge Functions
- `register-platform-admin`: Derives tier from `admin_access_codes.admin_tier`
- `manage-platform-admin`: Enforces tier hierarchy (supervisor > senior_admin > admin)

### Frontend
- `useAdminTier` hook: Returns `tier`, `isSupervisor`, `isSeniorAdmin`
- `AdminSidebar`: Tier-based visibility (Team Management, Seeker Config hidden for basic admin)
- `PlatformAdminForm`: Admin tier dropdown with hierarchy-restricted options
- `PlatformAdminListPage`: Tier column, tier-based CRUD buttons
- `CreatePlatformAdminPage`: Supervisor + Senior Admin can create (with tier restrictions)
- `EditPlatformAdminPage`: Supervisor only
- `ViewPlatformAdminPage`: Shows tier badge, supervisor-only edit/deactivate
- `Login.tsx`: Admin sub-tier selector (Supervisor | Senior Admin | Admin)

## Tier Permission Matrix

| Feature | Supervisor | Senior Admin | Admin |
|---------|-----------|--------------|-------|
| Dashboard | ✅ | ✅ | ✅ |
| Master Data | ✅ | ✅ | ✅ |
| Taxonomy | ✅ | ✅ | ✅ |
| Interview Setup | ✅ | ✅ | ✅ |
| Seeker Management | ✅ | ✅ | ✅ |
| Team Management (list) | ✅ | ✅ (view-only) | ❌ |
| Create Admin | ✅ (any tier) | ✅ (admin only) | ❌ |
| Edit Admin | ✅ | ❌ | ❌ |
| Deactivate Admin | ✅ | ❌ | ❌ |
| Seeker Config | ✅ | ✅ | ❌ |
| My Profile | ✅ | ✅ | ✅ |

## Zero-Impact Areas
- All 50+ RLS policies unchanged (still use `has_role(uid, 'platform_admin')`)
- `AdminGuard` unchanged
- `useUserRoles` unchanged
- `RoleBasedRedirect` unchanged
- All existing admin CRUD for master data, seekers, etc. untouched

---

# MOD-02: Auto-Assignment Engine — Implementation Complete

## What Was Implemented

### Database (Migration)
- **`admin_notifications`** — In-app notifications with type-based filtering, RLS (own + supervisor access)
- **`verification_assignments`** — Assignment records with scoring details, domain match scores
- **`verification_assignment_log`** — Audit trail of all engine decisions (supervisor-only read)
- **`open_queue_entries`** — Fallback queue for unassigned verifications with SLA deadlines
- **`notification_audit_log`** — Email/SMS delivery tracking (supervisor-only read)
- **`execute_auto_assignment` RPC** — 5-step algorithm: Affinity → Eligibility → Domain Scoring → Workload → Assign/Fallback
- **`get_eligible_admins_ranked` RPC** — Read-only scoring preview for reassignment UI
- **`md_mpa_config` seeded** — 9 new parameters (SLA thresholds, weights, queue timers)
- All tables have RLS enabled with proper policies

### Edge Functions
- **`assignment-engine`** — Orchestrator with 4.5s timeout guard, 2x retry on concurrent conflict, affinity routing
- **`notify-admin-assignment`** — In-app notification insertion + audit log + email placeholder

### Frontend — SCR-02-01: Notification Panel (All Tiers)
- **`NotificationBell.tsx`** — Bell icon with unread badge count (0, 1-9, 9+) in AdminHeader
- **`NotificationDrawer.tsx`** — Right-side Sheet with notification list, mark all read, empty state
- **`NotificationCard.tsx`** — 8 notification types with colored left borders and icons
- **`useAdminNotifications.ts`** — React Query hooks + Supabase Realtime subscription
- Integrated into `AdminHeader.tsx` for all admin tiers

### Frontend — SCR-02-02: Engine Audit Log (Supervisor Only)
- **`AssignmentAuditLogPage.tsx`** — Full audit log with filters (date range, outcome), table, CSV export
- **`ScoringSnapshotPanel.tsx`** — Expandable row detail with L1/L2/L3 score breakdown + progress bars
- **`useEngineAuditLog.ts`** — React Query hook with filtering support
- Route: `/admin/assignment-audit-log` with `TierGuard requiredTier='supervisor'`
- Sidebar: "Assignment Audit Log" under Team Management (Supervisor only)

### MOD-02 Role-Based Access Matrix

| Feature | Admin (Basic) | Senior Admin | Supervisor |
|---------|--------------|--------------|------------|
| Notification Bell + Panel | Own notifications | Own notifications | Own + QUEUE_ESCALATION + EMAIL_FAIL |
| Engine Audit Log | ❌ Hidden | ❌ Hidden | ✅ Full access + CSV export |
| Claim from Open Queue | If Available/PA | If Available/PA | Always visible |
| View scoring snapshots | ❌ | ❌ | ✅ Expandable rows |

---

# MOD-02 Gap Fix Log (Latest)

## What Was Fixed

### Database: `execute_auto_assignment` RPC Rewritten
- **GAP-1 (Two-Pass):** Pass 1 scores Available-only admins; Pass 2 adds Partially Available only if Pass 1 yields no L1>0 candidate
- **GAP-2 (Wildcard Scoring):** Empty `country_region_expertise` = half L2 points; empty `org_type_expertise` = half L3 points
- **GAP-3 (Weight Keys):** Now reads `l1_weight`/`l2_weight`/`l3_weight` from `md_mpa_config` (defaults 50/30/20)
- **GAP-4 (Round-Robin):** Final tiebreaker is `last_assignment_timestamp ASC NULLS FIRST` (not `random()`)
- **GAP-5 (Selection Reason):** Derives `highest_domain_score`, `workload_tiebreaker`, `priority_tiebreaker`, or `round_robin` dynamically
- **GAP-6 (Full Snapshot):** `scoring_snapshot.scoring_details` contains JSONB array of ALL candidates with L1/L2/L3 scores
- **GAP-16 (Timestamp):** Updates `last_assignment_timestamp = NOW()` on assignment
- **GAP-17 (Fallback Reasons):** Uses spec-defined enum values (`NO_ELIGIBLE_ADMIN`, etc.)
- Correct column names: `current_active_verifications`, `max_concurrent_verifications`, `country_region_expertise`
- Availability status values match actual data: `'Available'`, `'Partially Available'`

### Database: `get_eligible_admins_ranked` — Already Correct
- Was already using correct column names, wildcard scoring, round-robin tiebreaker, and returning all required fields

### UI: Audit Log Org Name Column (GAP-15)
- Added "Org Name" column between Date/Time and Outcome in the audit log table
- Reads from `snapshot.org_name`
- Already included in CSV export

## Remaining Linter Warnings (Pre-existing)
- Badge components use hardcoded colors (green-100, blue-100, etc.) — acceptable for status-specific styling
- Security definer view and function search_path warnings are pre-existing across the project

---

# MOD-05: Performance Metrics Dashboard — Implementation Complete

## What Was Implemented

### Database (Migration)
- **Extended `admin_performance_metrics`** — Added `sla_compliant_count`, `sla_breached_count`, `open_queue_claims`, `reassignments_received`, `reassignments_sent`, `period_start`, `period_end`, `computed_at`
- **RLS enabled** on `admin_performance_metrics` — Self-view (own metrics), Supervisor (all metrics), Insert (supervisor/senior_admin), Update (self + supervisor)
- **`get_realtime_admin_metrics` RPC** — SECURITY DEFINER, returns live M1/M2/M4/M5, period-filtered (7/30/90 days), enforces BR-MPA-038
- **`refresh_performance_metrics` RPC** — SECURITY DEFINER, supervisor-only permission guard, batch recalculates M1-M8 with 30-day rolling window
- **Performance indexes** — `idx_pav_completed_by_status`, `idx_pav_assigned_status`, `idx_val_reassignment_to`, `idx_val_reassignment_from`

### Frontend — SCR-05-01: All Admins Performance (Supervisor Only)
- **`AllAdminsPerformancePage.tsx`** — Team KPI bar, Admin Performance Table with SLA gauge (●●●●○), period selector (7/30/90d), CSV export with period in filename
- **`TeamSummaryKPIBar.tsx`** — 4 aggregated KPI cards (Green ≥95%, Amber 80-94%, Red <80%)
- **`AdminPerformanceTable.tsx`** — Table with overflow wrapper, low-SLA red row highlight, drill-down action
- **`PerformanceFilters.tsx`** — Period/Availability/Sort dropdowns (incl. At-Risk ↓, Avg Time ↓), secondary sort by name, CSV export
- Route: `/admin/performance` with `TierGuard requiredTier='supervisor'`

### Frontend — SCR-05-02: My Performance (All Admins)
- **`MyPerformancePage.tsx`** — 6 personal KPI cards (M1-M6) + M7/M8 + workload bar, period selector, "(Updated daily)" on M3/M6/M7/M8
- No peer comparison data (BR-MPA-038(a))
- Route: `/admin/my-performance` — all admin tiers

### Frontend — SCR-05-03: Admin Performance Detail (Supervisor Drill-Down)
- **`AdminPerformanceDetailPage.tsx`** — Admin header card + 8-metric grid (M1-M8) + period selector + SLA Breach History (90 days)
- **`AdminHeaderCard.tsx`** — Profile card with expertise tags, workload bar, Edit Profile / Reassign All / Adjust Availability buttons
- **`SlaBreachHistory.tsx`** — Breach table with org name, industry chips, tier badges, completion time as "X.Xd (Y% of SLA)", reassignment count
- Route: `/admin/performance/:adminId` with `TierGuard requiredTier='supervisor'`

### Shared Components
- **`MetricCard.tsx`** — Reusable metric card with icon, value, subtitle, trend coloring

### Hooks
- **`useAllAdminMetrics.ts`** — Parallel fetch of RPC + stored metrics, accepts `periodDays`, staleTime: 30s, refetchInterval: 60s
- **`useMyMetrics.ts`** — Self-only fetch via RPC, accepts `periodDays`, staleTime: 30s
- **`useAdminMetricsDetail.ts`** — Single admin metrics + 90-day SLA breach history with org name + industry segment join + reassignment counts

### Navigation
- Sidebar: "Team Performance" (supervisor only) + "My Performance" (all tiers) under Verification group
- All routes lazy-loaded

## MOD-05 Role-Based Access Matrix

| Feature | Admin (Basic) | Senior Admin | Supervisor |
|---------|--------------|--------------|------------|
| My Performance | ✅ Own data only | ✅ Own data only | ✅ Own data |
| Team Performance | ❌ Hidden | ❌ Hidden | ✅ All admins |
| Admin Detail | ❌ Hidden | ❌ Hidden | ✅ Drill-down |
| Refresh Metrics RPC | ❌ Blocked (DB guard) | ❌ Blocked | ✅ |
| CSV Export | ❌ | ❌ | ✅ |

## All 10 Gaps — Closed

| Gap | Fix |
|-----|-----|
| GAP-1 | Period selectors (7/30/90d) on all 3 screens + hooks |
| GAP-2 | M5 At-Risk uses `sla_breach_tier IN ('TIER1','TIER2','TIER3')` |
| GAP-3 | SLA thresholds: Green ≥95%, Amber 80-94%, Red <80% |
| GAP-4 | Sort: At-Risk ↓, Avg Time ↓ + secondary sort by name |
| GAP-5 | SlaBreachHistory: industry chips, "X.Xd (Y% of SLA)", reassignment count |
| GAP-6 | AdminHeaderCard: Edit Profile, Reassign All, Adjust Availability buttons |
| GAP-7 | "(Updated daily)" labels on M3/M6/M7/M8 |
| GAP-8 | Dropped overly broad `platform_admin_select_metrics` RLS policy |
| GAP-9 | `refresh_performance_metrics` uses 30-day rolling window |
| GAP-10 | Table overflow wrappers on AdminPerformanceTable + SlaBreachHistory |

## Zero-Impact Areas
- All existing RLS policies unchanged
- `register-platform-admin` / `manage-platform-admin` edge functions unaffected (new columns have defaults)
- No route conflicts with existing paths
- `AdminGuard`, `useUserRoles`, `RoleBasedRedirect` unchanged
