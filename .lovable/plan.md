

# Assignment Engine Audit Log — Figma Gap Analysis

## Comparison Summary

The screen is **~95% complete**. Most layout, filters, table structure, expanded scoring snapshot, and badge styling match the Figma design. Here are the minor gaps:

| # | Figma Design | Current Implementation | Gap Severity |
|---|-------------|----------------------|-------------|
| 1 | Selection Reason badge: **"highest score"** (lowercase) | Shows "Highest Score" (title case) | Minor — text case |
| 2 | Selection Reason badge: **"workload tiebreaker"** | Shows "Workload Tie" (truncated) | Minor — label text |
| 3 | Fallback row Selection Reason: **"NO ELIGIBLE ADMIN"** in red outlined badge | Shows "No Eligible" in red bg | Minor — label text + styling |
| 4 | Fallback row Assigned To / Domain Score / Pool Size show **"—"** (em dash) | Already shows "—" | ✅ Match |
| 5 | Domain Score shows **bold score** like "85/100" with progress bar | Already implemented | ✅ Match |
| 6 | Org Name as **blue clickable link** | Already implemented | ✅ Match |
| 7 | Expanded Candidate Scoring Snapshot table with Winner/Runner-up/Eliminated badges | Already implemented | ✅ Match |
| 8 | Filter labels above inputs (From Date, To Date, Admin, Outcome) | Already implemented | ✅ Match |
| 9 | "Supervisor Only" badge top-right | Already implemented | ✅ Match |

## Files to Change

### 1. `src/pages/admin/AssignmentAuditLogPage.tsx`
- Update `getSelectionReasonBadge` label mappings:
  - `highest_domain_score` → "highest score" (lowercase)
  - `workload_tiebreaker` → "workload tiebreaker" (full text)
  - `NO_ELIGIBLE_ADMIN` → "NO ELIGIBLE ADMIN" (uppercase, red **outline** badge instead of red bg)

Only 3 string labels need updating — no structural changes required.

