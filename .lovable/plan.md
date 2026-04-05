

# Fix My Challenges View — Governance-Aware UI

## Problems

1. **CurationProgressTracker shows for QUICK mode** — Detail view renders the curation tracker for any phase 2-3 challenge without checking governance mode. QUICK has no Curator role.
2. **Status messages wrong for QUICK** — "In Curation" appears for QUICK challenges at phase >1 in both the detail view and the list page.
3. **Dashboard routes to wrong URL** — `MyChallengesSection.tsx` navigates to `/cogni/challenges/${id}` (old screen) instead of `/cogni/challenges/${id}/view`.
4. **ProgressDetailCard fabricates curator status** — When no `curation_progress` row exists, it still renders "Submitted — waiting for Curator to begin".

## Changes (4 files, no new files)

### 1. `CreatorChallengeDetailView.tsx`
- Gate `CurationProgressTracker` behind `!isQuickMode`
- Make status banner governance-aware: QUICK shows "Processing" instead of "In Curation"

### 2. `MyChallengesPage.tsx`
- Add `governanceMode` parameter to `getStatusConfig`
- QUICK + IN_PREPARATION + phase > 1 shows "Processing" instead of "In Curation"
- Pass governance mode from `ChallengeCard`

### 3. `MyChallengesSection.tsx`
- Fix routing: `/cogni/challenges/${id}` → `/cogni/challenges/${id}/view`
- Show "Processing" for QUICK mode instead of "In Preparation" when phase > 1

### 4. `CurationProgressTracker.tsx`
- Return `null` when no progress data exists (don't fabricate "waiting for Curator")

## All files stay under 200 lines. No DB changes needed.

