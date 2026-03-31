

# Fix: Dashboard Showing Wrong Data + Invalid Routes

## Root Cause Analysis

Three interlinked issues identified:

### Issue 1: Active Challenges Shows 0
In `ActionItemsWidget.tsx` line 37, `filteredChallengeItems` checks `ch.master_status === 'DRAFT'` but the system never uses `DRAFT` as a master_status — drafts are `IN_PREPARATION` with `current_phase === 1`. Same problem on line 47 checking for `RETURNED` and `PUBLISHED` on line 43. The actual challenge (`master_status: IN_PREPARATION`, `current_phase: 2`) passes the `activeChallenges` filter but may be excluded by the role-based filter if timing mismatches occur between `useMyChallenges` and `useCogniUserRoles` data.

### Issue 2: Invalid Routes Show "Junk" Content
`MyActionItemsSection.tsx` lines 83 and 94 navigate to `/cogni/my-challenges/${id}` — **this route does not exist**. No route is defined for `/cogni/my-challenges/:id` in App.tsx. This causes a fallback/catch-all rendering that shows unrelated content (likely the Curator workspace or another component).

### Issue 3: Request Lifecycle Journey Not Scoped to Creator
The `CogniDashboardPage` passes `useMyChallenges` data to `RequestJourneySection`, but only when `isSpecRole` is true. This is correct but the journey section should show all the user's challenges regardless of `isSpecRole` filtering since the Creator always wants to see their challenge progress.

## Fix Plan (3 files)

### 1. `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`
- **Line 83**: Change `/cogni/my-challenges/${targetId}` → `/cogni/challenges/${targetId}/view`
- **Line 94**: Change `/cogni/my-challenges/${item.id}` → `/cogni/challenges/${item.id}/view`

### 2. `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`
- **Line 37**: Change `ch.master_status === 'DRAFT'` → `ch.master_status === 'IN_PREPARATION' && ch.current_phase === 1` (matches actual draft detection)
- **Line 43**: Remove `'PUBLISHED'` (not a valid master_status). Keep `ACTIVE` and `IN_PREPARATION`.
- **Line 47**: Change `'DRAFT'` → drafts matching `IN_PREPARATION && phase 1`. Change `'RETURNED'` logic to check `phase_status` instead.

### 3. `src/pages/cogniblend/CogniDashboardPage.tsx`
- Remove the `isSpecRole` gate on `journeyRequests` — always show lifecycle journey for Creator's own challenges.

## Files Changed

| File | Change |
|------|--------|
| `MyActionItemsSection.tsx` | Fix 2 invalid routes to `/cogni/challenges/:id/view` |
| `ActionItemsWidget.tsx` | Fix draft/active status detection to match real master_status values |
| `CogniDashboardPage.tsx` | Remove `isSpecRole` gate on journey section |

