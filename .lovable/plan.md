

# Clarification: "Add User" Is Redundant for Most Roles — Should Be Removed

## Your Understanding Is Correct

**"Add User" is NOT needed** for most roles in the Aggregator model. Here is why it currently exists and why it should be removed:

### Current (Wrong) Behavior
Once someone is invited to a role (e.g., R2 Account Manager), the UI shows **both**:
- Status badge (invited/active) ✓ correct
- "Add User" button ✗ unnecessary
- "Deactivate" button ✓ correct

The "Add User" button does the exact same thing as "Invite User" — it opens the same invite sheet. It was coded as a generic pattern without considering that **most roles need only 1 person**.

### The Only Exception: R7 (Expert Reviewer)
Per master data (`md_slm_role_codes`), **R7_AGG requires minimum 2 unique individuals**. So for R7 only, after inviting person #1, you genuinely need to add person #2. For every other role (R2, R4, R5_AGG, R6_AGG, R8, R9), once 1 person is assigned, the role is filled.

### Fix
In `RoleTable.tsx`, hide "Add User" when the role's `min_required` (default 1) is already met:

- **If `roleAssignments.length >= role.min_required`**: Show only status badge + Deactivate. No "Add User".
- **If `roleAssignments.length < role.min_required`** (only R7 with min 2): Show "Add User" to fill remaining slots.

This is a single conditional change in `RoleTable.tsx` lines 111-121.

