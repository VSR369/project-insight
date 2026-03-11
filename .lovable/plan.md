

# Fix: Add "Assign Member" Flow for Incomplete Teams

## Problem

The TeamCompletionBanner says "1 more Expert Reviewer (R7_MP) needed" but there is **no action to fill that gap**. The only existing action is "Reassign" — which swaps an existing person. There is no "Add Assignment" capability anywhere in the system.

The banner is a dead end. The admin sees the warning but cannot act on it without leaving the page, and even then, there is no screen to add a new role assignment to an existing challenge.

## Solution

Add an **"Assign Member" modal** triggered from the TeamCompletionBanner and from the challenge card itself. This modal lets the admin pick a missing role slot, select an eligible pool member, and create a new `challenge_role_assignments` row.

No new database tables or schema changes needed — the `challenge_role_assignments` table and the unique index already exist.

---

## Changes

### 1. New mutation: `useAssignMember` in `useSolutionRequests.ts`

Insert a new active assignment into `challenge_role_assignments` with audit fields. Invalidates the same query keys as `useReassignMember`. Simple insert — no old-record update needed (unlike reassignment).

### 2. New component: `AssignMemberModal.tsx`

A dialog with:
- **Role selector** — pre-populated with only the missing roles from `TeamComposition.missingRoles`. If only one role is missing, auto-select it.
- **Member selector** — filtered by: (a) pool members whose `role_codes` array contains the selected role, (b) not already assigned to that role on this challenge, (c) not fully booked.
- **No reason field** — this is a fresh assignment, not a reassignment.
- Reuses existing `usePoolMembers` hook with role filter and `useChallengeAssignments` for duplicate checks (same pattern as `ReassignmentModal`).

### 3. Update `TeamCompletionBanner.tsx`

Add an **"Assign Members"** button inside the amber banner that opens the `AssignMemberModal`. Pass the challenge ID and missing roles as props.

### 4. Update `AssignmentHistoryPage.tsx`

Add an **"+ Assign"** button in the challenge card header (next to the timestamp) that also opens `AssignMemberModal`. This provides a second entry point beyond the banner.

### 5. Duplicate guard

The existing unique partial index `idx_unique_active_role_per_member` on `(challenge_id, pool_member_id, role_code) WHERE status = 'active'` already enforces uniqueness at the DB level. The UI will also filter candidates client-side (same pattern as `ReassignmentModal`).

---

## Files

| File | Change |
|---|---|
| `src/hooks/queries/useSolutionRequests.ts` | Add `useAssignMember` mutation |
| `src/components/admin/marketplace/AssignMemberModal.tsx` | **New** — modal to assign a pool member to a missing role |
| `src/components/admin/marketplace/TeamCompletionBanner.tsx` | Add "Assign Members" button, accept `challengeId` + `challengeTitle` props |
| `src/pages/admin/marketplace/AssignmentHistoryPage.tsx` | Add "+ Assign" button per challenge card, wire up modal |

