

# My Performance Page — Figma Gap Analysis & Fix Plan

## Gaps Identified (Figma vs Current)

| # | Figma Element | Current State | Action |
|---|--------------|---------------|--------|
| 1 | **Header: "My Performance · Priya Sharma" + availability badge** | Only shows "My Performance" title, no name or status badge | Add admin name + `AdminStatusBadge` to header |
| 2 | **KPI cards have colored left borders** (green for SLA Rate, blue for Completed, etc.) | Plain `MetricCard` with no border color | Add `borderColor` prop to MetricCard, apply via `border-l-4` |
| 3 | **KPI labels differ** — "SLA Rate" not "SLA Rate (M2)", "Completed" not "Completed (M1)", "Avg Time" not "Avg Time (M3)", "Pending Now" not "Pending (M4)", "At Risk Now" not "At-Risk (M5)", "Queue Claims" not "Queue Claims (M6)" | Labels include metric IDs like `(M1)` | Remove `(M1)` through `(M6)` codes from labels; rename to match Figma exactly |
| 4 | **Subtitles differ** — SLA: "24/25 within SLA", Completed: "approved + rejected + returned", Avg Time: "excl. correction periods", Pending: "currently assigned", At Risk: "past 80% SLA", Queue Claims: "claimed from Open Queue" | Subtitles are generic ("Updated daily", "compliant / breached") | Update all subtitle text to match Figma |
| 5 | **SLA Compliance Timeline** — Line chart with data points, dashed target line at ~95%, trend annotation ("Improving trend (+3% this month)") | Entirely missing | Add new `SLAComplianceTimeline` component using Recharts `LineChart` with mock/placeholder data |
| 6 | **Workload Breakdown** section — Card showing "Current Pending (3 of 7)", individual org entries with SLA progress bars, tier badges (T1, T3 CRITICAL), "View all 7 →" link | Only a simple `WorkloadBar` one-liner | Add new `WorkloadBreakdown` component fetching pending assignments with SLA progress |
| 7 | **Bottom stats row** — "Reassignment Summary" (received 3 / sent 1 with icons), "Queue Claims Context" (4 of 25 completions, 16% from Open Queue), "Processing Time" (Your avg: 16.2h, excl. correction periods) | Reassignment cards are large standalone MetricCards; no Queue Claims Context or Processing Time summary | Replace the two reassignment MetricCards + workload bar with a compact 3-column footer row |
| 8 | **Period dropdown** shows "Period:" label prefix | No label prefix | Add "Period:" text before Select |

## Files to Change

### 1. `src/components/admin/performance/MetricCard.tsx`
- Add optional `borderColor` prop (e.g., `border-l-4 border-green-500`)
- Apply via className when provided

### 2. `src/pages/admin/performance/MyPerformancePage.tsx`
- Import `AdminStatusBadge` and display admin name + status in header
- Update all KPI labels and subtitles to match Figma
- Pass `borderColor` to each MetricCard (green for SLA, blue for Completed, etc.)
- Add "Period:" label before the Select
- Remove the two standalone Reassignment MetricCards
- Remove the simple WorkloadBar
- Add `SLAComplianceTimeline` component (new)
- Add `WorkloadBreakdown` component (new)
- Add bottom 3-column summary row (Reassignment Summary, Queue Claims Context, Processing Time)

### 3. `src/components/admin/performance/SLAComplianceTimeline.tsx` (NEW)
- Recharts `LineChart` with `ResponsiveContainer`
- Line for SLA compliance % over time
- Dashed `ReferenceLine` at 95% target
- Trend annotation text in top-right
- Placeholder data points for now (no historical SLA table exists yet — will use static sample data with a "Data updated daily" note)

### 4. `src/components/admin/performance/WorkloadBreakdown.tsx` (NEW)
- Fetch current pending assignments from `useMyAssignments()` (already exists in `useVerificationDashboard.ts`)
- Show each org with name, tier badge (T1/T2/T3 CRITICAL), and SLA elapsed progress bar
- Color code: green (<50%), orange (50-80%), red (>80%)
- "View all N →" link at bottom navigating to verification dashboard
- Show "Current Pending (X of Y)" using `current_pending` and `max_concurrent_verifications`

### 5. `src/hooks/queries/useMyMetrics.ts`
- Also fetch admin `full_name` and `availability_status` (already returned from RPC — just ensure the page uses them)

## Technical Notes
- SLA Compliance Timeline uses placeholder data — a future task can add a `daily_sla_snapshots` table or DB function for real historical data
- Workload Breakdown reuses `useMyAssignments()` hook and calculates SLA elapsed % from `sla_start_at` and `sla_duration_seconds`
- No new DB tables or migrations needed for this UI change

