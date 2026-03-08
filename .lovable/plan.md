

# Assignment Engine Audit Log — Figma vs Current Implementation

## Differences Identified

| # | Figma Design | Current Implementation | Fix |
|---|-------------|----------------------|-----|
| 1 | **"Supervisor Only" badge** top-right | Missing | Add badge next to header |
| 2 | Description: "View detailed logs of all assignment engine decisions and scoring" | "Review auto-assignment decisions, scoring snapshots, and fallback reasons." | Update text |
| 3 | **Filters inline** — From Date, To Date, Admin, Outcome, Export CSV all in one row, no Card wrapper | Wrapped in a Card with "Filters" header | Remove Card, make inline row |
| 4 | **Admin dropdown** filter ("All Admins") | Missing entirely | Add admin filter dropdown using `platform_admin_profiles` |
| 5 | Date format: `2026-03-06 14:32:15` | `MMM d, HH:mm` (e.g., "Mar 6, 14:32") | Change to `yyyy-MM-dd HH:mm:ss` |
| 6 | Domain Score: **"85/100"** with progress bar | Shows bare number + progress bar | Format as `{score}/100` |
| 7 | Selection Reason reads from **snapshot** | Uses `log.reason` (wrong field — that's fallback reason) | Read `snapshot.selection_reason` instead |
| 8 | Pool Size: **"5 candidates"** | Just the number | Append " candidates" text |
| 9 | **No "Fallback Reason" column** in main table | Extra column exists | Remove column |
| 10 | Org Name shown as **blue clickable link** | Plain text | Make clickable link to verification |
| 11 | Fallback outcome: **"Fallback: Queue"** | Just "Fallback" | Update badge text |
| 12 | Expanded section: **"Candidate Scoring Snapshot"** with subtitle "Detailed breakdown of all candidates evaluated by the assignment engine" | "Candidate Scoring Breakdown", no subtitle | Update title + add subtitle |
| 13 | Snapshot columns: **"Admin Name", "L1 Score", "L2 Score", "L3 Score"** — no Tier column | Has "Admin", "Tier", "L1 (Industry)", "L2 (Country)", "L3 (Org Type)" | Remove Tier column, rename headers |
| 14 | Eliminated rows: **strikethrough on admin name** | No strikethrough | Add `line-through` class |
| 15 | Outcome badges: **"Winner"** (green), **"Runner-up"**, **"Eliminated"** (red) | "WINNER", "L1=0", "Runner-up" | Match Figma labels exactly |
| 16 | Snapshot panel: no summary row (Method/Pass/Pool/Winner) | Has a 5-column summary grid | Remove summary grid — Figma shows only the candidate table |
| 17 | Main table has **no Card wrapper** | Wrapped in Card | Remove Card, use clean table |

## Files to Change

### 1. `src/pages/admin/AssignmentAuditLogPage.tsx`
- Add "Supervisor Only" badge beside title
- Update description text
- Remove Card wrapper from filters — make inline row with From Date, To Date, Admin dropdown, Outcome dropdown, Export CSV button
- Add Admin filter: fetch admin list from `usePlatformAdmins()`, populate Select dropdown
- Remove "Fallback Reason" column (column 9)
- Fix date format to `yyyy-MM-dd HH:mm:ss`
- Fix Domain Score to show `{score}/100`
- Fix Selection Reason to use `snapshot.selection_reason` not `log.reason`
- Fix Pool Size to append " candidates"
- Make Org Name a blue link navigating to `/admin/verifications/{verification_id}`
- Update Fallback badge text to "Fallback: Queue"
- Remove Card wrapper from table
- Update colSpan from 9 to 8 in expanded row

### 2. `src/components/admin/assignment-audit/ScoringSnapshotPanel.tsx`
- Remove the 5-column summary grid (Method/Pass/Pool/Selection Reason/Winner)
- Update title to "Candidate Scoring Snapshot"
- Add subtitle: "Detailed breakdown of all candidates evaluated by the assignment engine"
- Remove "Tier" column
- Rename headers: "Admin Name", "L1 Score", "L2 Score", "L3 Score", "Total", "Workload %", "Priority", "Outcome"
- Add `line-through` text decoration on eliminated candidate names
- Change outcome badge labels: "WINNER" → "Winner", "L1=0" → "Eliminated", keep "Runner-up"

### 3. `src/hooks/queries/useEngineAuditLog.ts`
- Add `adminId` filter support (already exists, just needs the Admin dropdown in the UI to pass it)

