

# Updated Plan: Fix Dashboard Data + Invalid Routes

## Changes from Previous Plan

**Browse Challenges**: Keep it in the SOLVER section (line 66) — no change needed. It is already hidden for Creator-only users via `isSectionVisible('SOLVER')` returning false when `isSeekingOrgOnly` is true. The user confirms this is correct behavior.

## Fix Plan (3 files)

### 1. `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`
Fix 2 invalid route links that navigate to a non-existent path, causing junk/fallback content:
- Change `/cogni/my-challenges/${targetId}` → `/cogni/challenges/${targetId}/view`
- Change `/cogni/my-challenges/${item.id}` → `/cogni/challenges/${item.id}/view`

### 2. `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`
Fix status filtering that causes "Active Challenges: 0":
- Draft detection: `ch.master_status === 'DRAFT'` → `ch.master_status === 'IN_PREPARATION' && ch.current_phase === 1`
- Active filter: remove invalid `'PUBLISHED'` status, keep `ACTIVE` and `IN_PREPARATION`
- Returned detection: check `phase_status === 'RETURNED'` instead of `master_status === 'RETURNED'`

### 3. `src/pages/cogniblend/CogniDashboardPage.tsx`
Remove `isSpecRole` gate on `RequestJourneySection` so Creators always see their challenge lifecycle progress.

## Files Changed

| File | Change |
|------|--------|
| `MyActionItemsSection.tsx` | Fix 2 invalid routes to `/cogni/challenges/:id/view` |
| `ActionItemsWidget.tsx` | Fix draft/active/returned status detection |
| `CogniDashboardPage.tsx` | Remove `isSpecRole` gate on journey section |

