

# Platform Admin List — Figma Gap Analysis & Fix Plan

## Gaps Identified

| # | Figma Design | Current Implementation | Fix |
|---|-------------|----------------------|-----|
| 1 | **Name + email stacked** in one "FULL NAME" column | Separate "Name" and "Email" columns | Combine into single column: name bold, email below in muted text |
| 2 | **No Tier column, no Supervisor column** in table | Both exist as separate columns | Remove Tier and Supervisor columns from table |
| 3 | **Column headers uppercase**: FULL NAME, AVAILABILITY STATUS, WORKLOAD, etc. | Title case | Use uppercase text styling on headers |
| 4 | **Workload: number above bar** (e.g., "4/10" then bar below) | Number beside bar horizontally | Update `WorkloadBar` to stack vertically |
| 5 | **Priority badge**: "Priority 1" text (not just "1") | Shows bare number in badge | Update `AssignmentPriorityBadge` to show "Priority {n}" |
| 6 | **Industry tags** show "+2 more" overflow with distinct style | Already has `max={2}` but verify "+N more" styling | Verify ExpertiseTags renders "+N more" badge |
| 7 | **Actions**: only Edit (pencil) + Deactivate (X) — no Eye icon | Has Eye + Edit + Deactivate | Remove the Eye/View button |
| 8 | **Button text**: "+ Add Platform Admin" | "+ Add Admin" | Update button label |
| 9 | **Status filter label**: "All" | "All Statuses" | Change to "All" |
| 10 | **Pagination**: "Showing 1 to 5 of 5 results" left, numbered page buttons right | "Page X of Y" centered with Prev/Next | Redesign pagination to match Figma |
| 11 | **Add Tier filter** dropdown (user request) | Not present | Add tier filter: All Tiers, Supervisor, Senior Admin, Admin |

## Files to Change

### 1. `src/pages/admin/platform-admins/PlatformAdminListPage.tsx`
- Add `tierFilter` state + tier filter dropdown beside status filter
- Combine Name+Email into one "FULL NAME" cell (name bold, email below muted)
- Remove Tier, Supervisor, Email columns
- Remove Eye button from actions
- Reorder columns: Full Name, Availability Status, Workload, Industry Expertise, Priority, Last Assignment, Actions
- Uppercase column headers via `uppercase text-xs tracking-wider`
- Update button text to "Add Platform Admin"
- Change "All Statuses" label to "All"
- Apply tier filter to `paginatedAdmins` (client-side filter on `admin_tier`)
- Redesign pagination: left shows "Showing X to Y of Z results", right shows numbered page buttons with Previous/Next

### 2. `src/components/admin/platform-admins/WorkloadBar.tsx`
- Change layout from horizontal (bar + number side-by-side) to vertical (number on top, bar below)

### 3. `src/components/admin/platform-admins/AssignmentPriorityBadge.tsx`
- Change display from bare number "1" to "Priority 1"

