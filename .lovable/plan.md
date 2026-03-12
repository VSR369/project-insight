

# Status: All Previously Approved Fixes Are Already Implemented

After reviewing the current codebase, every item from the approved plan has already been applied:

| Requirement | Status |
|---|---|
| Button label consistency ("Assign User") | Done — RoleTable lines 107-108 |
| Vertical per-user status rows | Done — both files use `flex-col gap-1.5` with per-assignment badges |
| No restriction on adding users to any role | Done — "Assign User" button always visible, no `min_required` gate |
| Expert Reviewer minimum warning | Done — amber warning at lines 123-127 in RoleTable |
| Show all assignments (not just "active") | Done — RoleReadinessTable line 49 has no status filter |
| DB-driven status badges (Invited/Active/Declined) | Done — `RoleAssignmentStatusBadge` renders whatever status is in the DB |

### What about invitation accept/decline flow?

The **UI display** is correct — it will show "Invited", "Active", "Declined", or any other status stored in `role_assignments.status`. The actual **status transitions** (invited → active when user accepts, invited → declined when user declines) are a backend/workflow concern handled by the invitation acceptance flow, not by these table components.

**No further code changes are needed** — the approved plan has been fully implemented.

