

# Upload Deliverables Data to Challenge

## What
Programmatically populate the **Deliverables** section for challenge `edab47e4-ed9b-4b2c-b450-f64d53e3b8a9` with the 6 structured deliverables you provided, saving directly to the database.

## Approach
Run a Supabase update via the app's data layer — update the `deliverables` column on the `challenges` table with the structured JSON, and clear the localStorage cache so the Zustand store re-hydrates on next page load.

## Data Format
The `deliverables` column stores JSON in the format:
```json
{
  "items": [
    { "id": "D1", "name": "...", "description": "...", "acceptance_criteria": "..." },
    { "id": "D2", "name": "...", "description": "...", "acceptance_criteria": "..." },
    ...
  ]
}
```

## Deliverables to Insert
| ID | Name | Description | Acceptance Criteria |
|----|------|-------------|-------------------|
| D1 | Downtime Reduction Program | Implement predictive maintenance to significantly reduce unplanned CNC machine downtime and associated revenue loss. | ≥30% reduction in unplanned downtime within 6 months; Measurable decrease in downtime cost (₹/hour basis); Monthly downtime reports validated by operations team |
| D2 | Predictive Failure Alerts | Generate reliable 48–72 hour advance alerts for critical component failures to enable planned interventions. | ≥80% of critical failures predicted at least 48 hours in advance; ≤10% false positive alert rate; Alerts accessible to supervisors via dashboard/SMS/email |
| D3 | Maintenance Cost Optimization | Transition from calendar-based to condition-based maintenance to reduce unnecessary replacements and repair costs. | ≥20% reduction in preventive maintenance costs; Reduction in premature part replacements (tracked monthly); Documented shift from time-based to condition-based schedules |
| D4 | Production Reliability Improvement | Improve machine availability and stability to consistently meet production targets across all shifts. | ≥10–15% improvement in machine availability (uptime %); Reduction in production disruptions due to machine failure; Shift-wise production targets consistently achieved |
| D5 | Spare Parts Optimization | Align spare parts inventory with actual equipment condition to minimize excess stock and emergency procurement. | ≥15% reduction in spare parts inventory holding cost; Reduction in emergency spare procurement incidents; Inventory levels aligned with predicted failure timelines |
| D6 | ROI & Performance Dashboard | Provide a centralized dashboard to track financial savings, system performance, and predictive accuracy. | Real-time visibility of downtime savings and maintenance cost reduction; KPI tracking (prediction accuracy, uptime, cost savings) updated daily/weekly; ROI demonstrated within 6–9 months of implementation |

## Implementation Steps

1. **Create a temporary helper component** that runs once on mount to call `setSectionData('deliverables', payload)` on the Zustand store for this challenge, then triggers a sync flush to write to the `challenges.deliverables` DB column.

2. **Alternatively (simpler)**: Add the data directly via a one-time database update using Supabase client, then invalidate the React Query cache so the curation page picks it up.

3. **Verify** the deliverables render correctly as structured cards on the Scope & Complexity tab.

## Technical Detail
- File: `src/hooks/useCurationStoreSync.ts` — maps `deliverables` section → `deliverables` DB column
- Store: `curationFormStore` — `setSectionData('deliverables', { items: [...] })`
- The sync layer writes `entry.data` directly to the column, so the JSON object goes as-is

