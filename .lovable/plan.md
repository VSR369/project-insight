

# Plan: MOD-05 — Performance Metrics Dashboard

## Current State

**Exists:**
- `admin_performance_metrics` table with basic columns: `id`, `admin_id`, `verifications_completed`, `avg_processing_hours`, `sla_compliance_rate_pct`, `created_at`, `updated_at`
- `platform_admin_verifications` with `status`, `sla_start_at`, `sla_paused_duration_hours`, `sla_breached`, `sla_breach_tier`, `completed_at`, `completed_by_admin_id`, `assigned_admin_id`
- `verification_assignments` with `assignment_method`, `assigned_admin_id`, `assigned_at`, `is_current`
- `verification_assignment_log` with `event_type`, `from_admin_id`, `to_admin_id`
- `platform_admin_profiles` with `full_name`, `is_supervisor`, `availability_status`, `max_concurrent_verifications`, `current_active_verifications`, `assignment_priority`, `admin_tier`, `industry_expertise`, `country_region_expertise`, `org_type_expertise`

**Does Not Exist:**
- SCR-05-01: All Admins Performance Dashboard (Supervisor)
- SCR-05-02: My Performance (Self-View, all admins)
- SCR-05-03: Admin Performance Detail (Supervisor drill-down)
- `get_realtime_admin_metrics` RPC
- `refresh_performance_metrics` RPC
- Additional columns on `admin_performance_metrics` (M6-M8, period fields)
- React Query hooks: `useAllAdminMetrics`, `useMyMetrics`, `useAdminMetricsDetail`
- Routes: `/admin/performance`, `/admin/my-performance`, `/admin/performance/:adminId`

---

## Implementation Plan

### 1. Database Migration — Extend `admin_performance_metrics` + Create RPCs

**Alter `admin_performance_metrics`** to add spec columns:
```sql
ALTER TABLE admin_performance_metrics
  ADD COLUMN IF NOT EXISTS sla_compliant_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sla_breached_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS open_queue_claims INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reassignments_received INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reassignments_sent INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS period_start DATE,
  ADD COLUMN IF NOT EXISTS period_end DATE,
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ;
```

**Create `get_realtime_admin_metrics` RPC** (SECURITY DEFINER):
- Input: `p_admin_id UUID DEFAULT NULL` (NULL = all admins for Supervisor)
- Returns: `admin_id`, `current_pending` (M4), `sla_at_risk_count` (M5), `m1_completed_live` (M1), `m2_compliance_live` (M2)
- Queries `platform_admin_verifications` for live counts
- Enforces BR-MPA-038: non-supervisors can only query their own ID

**Create `refresh_performance_metrics` RPC** (SECURITY DEFINER):
- Recalculates M1-M8 from source tables for all active admins
- Updates `admin_performance_metrics` rows (upsert by `admin_id`)
- Computes: `verifications_completed`, `sla_compliant_count`, `sla_breached_count`, `avg_processing_hours`, `open_queue_claims`, `reassignments_received`, `reassignments_sent`

**RLS on `admin_performance_metrics`:**
- Self-view: authenticated user can SELECT where `admin_id` matches their profile
- Supervisor: can SELECT all rows

### 2. SCR-05-01: All Admins Performance Dashboard (Supervisor Only)

**Route:** `/admin/performance` — Supervisor only. Non-supervisors redirect to `/admin/my-performance`.

**Components:**
- `AllAdminsPerformancePage.tsx` — page wrapped in `FeatureErrorBoundary`
- `TeamSummaryKPIBar.tsx` — 4 cards: Team SLA Rate (amber/green/red), Total Pending, At-Risk, Queue Unclaimed
- `AdminPerformanceTable.tsx` — table with columns:
  - Admin Name + availability badge (green/amber/red pill)
  - SLA Rate (M2) with color-coded spark gauge (●●●●○)
  - Completed (M1), Avg Time (M3), Pending (M4) with workload bar, At-Risk (M5) red badge, Queue Claims (M6), Reassign In/Out (M7/M8), Actions ("View Detail →")
- `PerformanceFilters.tsx` — Period selector (7/30/90 days), Sort By, Availability filter, Export CSV
- Row with SLA < 80% gets light-red background
- Zero-completion admins show "—" for rate, grey row

**Hook:** `useAllAdminMetrics.ts` — parallel fetch of `admin_performance_metrics` + `get_realtime_admin_metrics` RPC, merged. `staleTime: 30s`, `refetchInterval: 60s`.

### 3. SCR-05-02: My Performance (Self-View, All Admins)

**Route:** `/admin/my-performance` — All platform_admin role users.

**Components:**
- `MyPerformancePage.tsx` — self-only metrics page
- 6 personal KPI cards: M1 Completed, M2 SLA Rate, M3 Avg Time, M4 Pending, M5 At-Risk, M6 Queue Claims
- Workload breakdown: pending list with SLA bars, M7/M8 reassignment counts
- Period selector (7/30/90 days)
- No peer comparison data (BR-MPA-038(a))

**Hook:** `useMyMetrics.ts` — fetches own metrics only via `admin_performance_metrics` + `get_realtime_admin_metrics(p_admin_id: ownId)`.

### 4. SCR-05-03: Admin Performance Detail (Supervisor Drill-Down)

**Route:** `/admin/performance/:adminId` — Supervisor only.

**Components:**
- `AdminPerformanceDetailPage.tsx`
- Admin Header Card: name, supervisor badge, availability, domain chips, workload bar, priority, quick action buttons
- Full 8-Metric detail panel (M1-M8) in 2×4 grid cards with sub-details
- SLA Breach History table: org name, industry chips, breach tier badge, completion time, admin processing time, reassignment count (last 90 days, max 20 rows)

**Hook:** `useAdminMetricsDetail.ts` — fetches single admin's metrics + breach history from `platform_admin_verifications` WHERE `sla_breached = TRUE`.

### 5. Sidebar & Routing

**AdminSidebar.tsx:** Add "Performance" entry under Verification group:
- "All Admins Performance" (supervisor only)
- "My Performance" (all tiers)

**App.tsx:** Add 3 lazy-loaded routes:
```tsx
<Route path="performance" element={<TierGuard requiredTier="supervisor"><AllAdminsPerformancePage /></TierGuard>} />
<Route path="my-performance" element={<MyPerformancePage />} />
<Route path="performance/:adminId" element={<TierGuard requiredTier="supervisor"><AdminPerformanceDetailPage /></TierGuard>} />
```

---

## Impact Analysis

| Area | Risk | Mitigation |
|------|------|------------|
| `admin_performance_metrics` table | ALTER adds columns with defaults — no data loss | All new columns have DEFAULT 0 or NULL |
| Existing `register-platform-admin` / `manage-platform-admin` edge fns | They INSERT into `admin_performance_metrics` with `admin_id` only | New columns have defaults — no breaking change |
| Existing admin routes | No routes conflict — new paths `/performance`, `/my-performance` | No overlap |
| RLS on `admin_performance_metrics` | Currently no RLS — adding policies | Enable RLS + add self/supervisor policies |
| Types file | Auto-updated after migration | No manual edits |

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | Schema extension + RPCs + RLS |
| `src/pages/admin/performance/AllAdminsPerformancePage.tsx` | SCR-05-01 |
| `src/pages/admin/performance/MyPerformancePage.tsx` | SCR-05-02 |
| `src/pages/admin/performance/AdminPerformanceDetailPage.tsx` | SCR-05-03 |
| `src/components/admin/performance/TeamSummaryKPIBar.tsx` | 4 KPI cards |
| `src/components/admin/performance/AdminPerformanceTable.tsx` | Main table |
| `src/components/admin/performance/PerformanceFilters.tsx` | Filters |
| `src/components/admin/performance/MetricCard.tsx` | Reusable metric card |
| `src/components/admin/performance/SlaBreachHistory.tsx` | Breach table for SCR-05-03 |
| `src/components/admin/performance/AdminHeaderCard.tsx` | Header for SCR-05-03 |
| `src/hooks/queries/useAllAdminMetrics.ts` | Hook for SCR-05-01 |
| `src/hooks/queries/useMyMetrics.ts` | Hook for SCR-05-02 |
| `src/hooks/queries/useAdminMetricsDetail.ts` | Hook for SCR-05-03 |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add Performance entries |
| `src/App.tsx` | Add 3 routes |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

