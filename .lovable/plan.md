

# Fix: Enforce Unique Expert Reviewers Per Challenge

## Requirement Clarification

- One person **CAN** hold multiple **different** roles on the same challenge (e.g., R3 + R7_MP) — this is valid.
- One person **CANNOT** be assigned the **same role** twice on the same challenge — specifically, if 2x R7_MP Expert Reviewers are required, they must be 2 **distinct individuals**.

## Changes

### 1. Database: Unique Constraint on (challenge_id, pool_member_id, role_code)

Add a partial unique index for active assignments to prevent the same person being assigned the same role twice on one challenge:

```sql
CREATE UNIQUE INDEX idx_unique_active_role_per_member
  ON challenge_role_assignments (challenge_id, pool_member_id, role_code)
  WHERE status = 'active';
```

### 2. Fix Existing Seed Data

Delete the duplicate R7_MP row for the same pool member on the same challenge (the seed migration assigned the single pool member as R7_MP twice). After cleanup, that challenge will show 1/2 R7_MP filled instead of 2/2.

### 3. UI: Role-Aware Status with Gap Tracking

Update `useSolutionRequests` to fetch `role_code` + `pool_member_id` per assignment (not just count), then compute a `TeamComposition` object:

```typescript
interface TeamComposition {
  R3: number; R5_MP: number; R6_MP: number; R7_MP: number;
  isComplete: boolean;
  missingRoles: { role: string; required: number; assigned: number }[];
}
```

Count **unique** `pool_member_id` per `role_code` per challenge. Update `getAssignmentStatus()` to use this structure.

### 4. Team Completion Banner on Assignment History

New `TeamCompletionBanner` component shown inside each challenge card when `!isComplete`. Displays amber warning:

> "Team Incomplete — 1 more Expert Reviewer (R7_MP) needed. Assign a different team member to proceed."

### 5. Validation Guard in Reassignment Flow

In the `ReassignmentModal`, when assigning a new member to R7_MP, check that the selected person isn't already assigned as R7_MP on the same challenge. Show inline error if duplicate detected.

### 6. Reminder for Stale Incomplete Teams

New `TeamCompletionReminder` component on Solution Requests page — shows a top-level amber card when any challenge has been partially assigned for >24 hours, with links to complete assignment.

## Files

| File | Change |
|---|---|
| Database migration | Add partial unique index on `(challenge_id, pool_member_id, role_code)` where `status = 'active'` |
| Database (data fix) | Delete duplicate R7_MP seed rows |
| `src/hooks/queries/useSolutionRequests.ts` | Return `TeamComposition` per challenge instead of raw count |
| `src/pages/admin/marketplace/SolutionRequestsPage.tsx` | Use role-aware status logic; add `TeamCompletionReminder` |
| `src/pages/admin/marketplace/AssignmentHistoryPage.tsx` | Add `TeamCompletionBanner` per challenge card |
| `src/components/admin/marketplace/TeamCompletionBanner.tsx` | **New** — amber banner showing missing role slots |
| `src/components/admin/marketplace/TeamCompletionReminder.tsx` | **New** — top-level reminder for stale incomplete assignments |
| `src/components/admin/marketplace/ReassignmentModal.tsx` | Add duplicate-member validation for same role_code |

