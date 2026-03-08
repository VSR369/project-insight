

# Plan: Close All 10 MOD-05 Gaps

## Database Migration (New)

**Fix GAP-2 (M5 logic), GAP-8 (conflicting RLS), GAP-9 (rolling window):**

```sql
-- Drop overly broad original policy (GAP-8)
DROP POLICY IF EXISTS "platform_admin_select_metrics" ON admin_performance_metrics;

-- Replace get_realtime_admin_metrics with period support + correct M5 (GAP-2, GAP-1 DB side)
-- Add p_period_days param, filter M1/M2 by completed_at window
-- Fix M5: use sla_breach_tier IN ('TIER1','TIER2','TIER3') instead of sla_breached = TRUE OR time > 48h

-- Replace refresh_performance_metrics with 30-day window (GAP-9)
-- Add WHERE completed_at >= NOW() - INTERVAL '30 days' on all M1-M3 subqueries
-- Add WHERE assigned_at >= NOW() - INTERVAL '30 days' on M6-M8 subqueries
```

## Frontend Changes

### GAP-1: Period Selectors (all 3 screens + hooks)

| File | Change |
|------|--------|
| `PerformanceFilters.tsx` | Add `period` / `onPeriodChange` props; render period dropdown (7/30/90 days) |
| `AllAdminsPerformancePage.tsx` | Add `period` state (default 30), pass to `useAllAdminMetrics(period)` and `PerformanceFilters` |
| `MyPerformancePage.tsx` | Add `period` state + period dropdown, pass to `useMyMetrics(period)` |
| `AdminPerformanceDetailPage.tsx` | Add `period` state + period dropdown, pass to `useAdminMetricsDetail(adminId, period)` |
| `useAllAdminMetrics.ts` | Accept `periodDays` param, pass `p_period_days` to RPC |
| `useMyMetrics.ts` | Accept `periodDays` param, pass `p_period_days` to RPC |
| `useAdminMetricsDetail.ts` | Accept `periodDays` param, pass `p_period_days` to RPC |

### GAP-3: Fix SLA thresholds (>=95 green, 80-94 amber, <80 red)

| File | Lines to change |
|------|----------------|
| `AdminPerformanceTable.tsx` | Line 20: `>= 90` → `>= 95` |
| `TeamSummaryKPIBar.tsx` | Line 20-21: `>= 90` → `>= 95` |
| `MyPerformancePage.tsx` | Line 38: `>= 90` → `>= 95` |
| `AdminPerformanceDetailPage.tsx` | Line 40: `>= 90` → `>= 95` |

### GAP-4: Add sort options + secondary sort

| File | Change |
|------|--------|
| `PerformanceFilters.tsx` | Add `at_risk_desc` and `avg_time_desc` SelectItems |
| `AllAdminsPerformancePage.tsx` | Add sort cases + secondary `.sort()` tiebreaker by `full_name` |

### GAP-5: Enhanced SlaBreachHistory columns

| File | Change |
|------|--------|
| `SlaBreachHistory.tsx` | Add columns: industry chips, completion time as "X.X days (Y% of SLA)", reassignment count. Remove "Status" column. |
| `useAdminMetricsDetail.ts` | Extend breach query: join `seeker_organizations.industry_segments`, add reassignment count subquery or separate fetch |
| `SlaBreachRecord` type | Add `industry_segments`, `reassignment_count`, `sla_target_hours` fields |

### GAP-6: AdminHeaderCard quick action buttons

| File | Change |
|------|--------|
| `AdminHeaderCard.tsx` | Add 3 buttons: "Edit Profile" (navigates to admin edit), "Reassign All" (placeholder action), "Adjust Availability" (placeholder action). Add `useNavigate`. |

### GAP-7: "(updated daily)" labels on M3/M6/M7/M8

| File | Change |
|------|--------|
| `MyPerformancePage.tsx` | Add `subtitle="Updated daily"` to M3, M6, M7, M8 MetricCards |
| `AdminPerformanceDetailPage.tsx` | Same for M3, M6, M7, M8 |

### GAP-10: Table overflow wrappers

| File | Change |
|------|--------|
| `AdminPerformanceTable.tsx` | Wrap `<Table>` in `<div className="relative w-full overflow-auto">` |
| `SlaBreachHistory.tsx` | Same wrapper |

## Files Summary

| File | Gaps Addressed |
|------|---------------|
| New migration SQL | GAP-2, GAP-8, GAP-9 |
| `PerformanceFilters.tsx` | GAP-1, GAP-4 |
| `AllAdminsPerformancePage.tsx` | GAP-1, GAP-4 |
| `MyPerformancePage.tsx` | GAP-1, GAP-3, GAP-7 |
| `AdminPerformanceDetailPage.tsx` | GAP-1, GAP-3, GAP-7 |
| `AdminPerformanceTable.tsx` | GAP-3, GAP-10 |
| `TeamSummaryKPIBar.tsx` | GAP-3 |
| `AdminHeaderCard.tsx` | GAP-6 |
| `SlaBreachHistory.tsx` | GAP-5, GAP-10 |
| `useAllAdminMetrics.ts` | GAP-1 |
| `useMyMetrics.ts` | GAP-1 |
| `useAdminMetricsDetail.ts` | GAP-1, GAP-5 |

## Impact Analysis

- **Migration**: Drops one overly-broad RLS policy (replaced by the 2 restrictive ones from MOD-05 migration). Replaces both RPCs with corrected versions — no schema changes, only function logic updates.
- **No breaking changes**: All frontend changes are additive (new props with defaults). Hooks gain optional `periodDays` parameter defaulting to 30.
- **Existing edge functions**: `register-platform-admin` and `manage-platform-admin` insert into `admin_performance_metrics` without specifying the new columns — defaults handle this.

