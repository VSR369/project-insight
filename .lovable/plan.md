

# Plan: Fix Dashboard — Clean Two-Section Layout

## What's Wrong Now

The dashboard currently renders **three overlapping data tables**:
1. `ActionItemsWidget` — shows welcome banner + stats + its own "My Action Items" table (all challenges/SRs)
2. `MyActionItemsSection` — another "My Action Items" table (DRAFT/RETURNED/AM_APPROVAL_PENDING)
3. `MyRequestsTracker` — "My Requests" with expandable timeline

The result: duplicate data, confusion, and wasted screen space.

Additionally, the **"View" button routes to `ChallengeManagePage`** which shows post-publication content (Submissions, Q&A, Amendments) — completely wrong for an AM who wants to see what they originally entered.

## Proposed Layout

```text
┌─────────────────────────────────────────────────┐
│  Welcome Banner + Stats (from ActionItemsWidget)│
│  NO action items table inside this widget       │
├─────────────────────────────────────────────────┤
│  MY ACTION ITEMS (MyActionItemsSection)         │
│  DRAFT / RETURNED / AM_APPROVAL_PENDING only    │
│  Smart routing per status                       │
├─────────────────────────────────────────────────┤
│  MY REQUESTS (MyRequestsTracker)                │
│  All requests with expandable audit timeline    │
│  "View" → read-only challenge detail (not junk) │
├─────────────────────────────────────────────────┤
│  Notifications (compact)                        │
└─────────────────────────────────────────────────┘
```

## Changes

### 1. Strip action items table from `ActionItemsWidget`
**File**: `src/components/cogniblend/dashboard/ActionItemsWidget.tsx`

Remove the entire "Action Items Table" section (lines 217–342) — the table, empty state card, and "See all tasks" link. Keep only the welcome banner and stat cards. This eliminates the duplicate table.

### 2. Fix "View" routing in `MyRequestsTracker`
**File**: `src/components/cogniblend/dashboard/MyRequestsTracker.tsx`

Currently the "View" button goes to `/cogni/challenges/${item.id}` which is `ChallengeManagePage` (Submissions, Q&A, Amendments — irrelevant for pre-publication items). Change to:
- **DRAFT** → `/cogni/challenges/${item.id}/edit` (continue editing)
- **Phase 1-2** → `/cogni/challenges/${item.id}/spec` (see the spec created from their brief)
- **Phase 3** → `/cogni/challenges/${item.id}/legal` (legal docs stage)
- **Phase 4-5** → `/cogni/challenges/${item.id}/view` (read-only detail)
- **PUBLISHED / Phase 7+** → `/cogni/challenges/${item.id}/manage` (manage page is appropriate here)
- **Default** → `/cogni/challenges/${item.id}/view` (read-only public detail — shows what the AM entered, not post-pub junk)

### 3. Fix "Action" routing in `MyActionItemsSection`
**File**: `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`

The `getActionRoute` function already has decent routing but `AM_APPROVAL_PENDING` routes to `/cogni/approval` which is the approval queue page. Verify this is correct (it should be — that's where the AM reviews and approves/declines).

### 4. Ensure AM_APPROVAL_PENDING items surface in MyActionItemsSection
**File**: `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`

The current logic checks `ch.phase_status === 'AM_APPROVAL_PENDING'` which should catch items sent by the Curator for AM approval. Verify the `useMyChallenges` hook returns these items — if it only returns challenges where the user has an active `user_challenge_roles` entry, then AM_APPROVAL_PENDING items (where the AM role exists) should appear. If not, add a supplementary query for challenges with `phase_status = 'AM_APPROVAL_PENDING'` in the user's organization.

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` | Remove action items table, keep only banner + stats |
| `src/components/cogniblend/dashboard/MyRequestsTracker.tsx` | Phase-aware "View" routing instead of blanket `/cogni/challenges/:id` |
| `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` | Verify AM_APPROVAL_PENDING surfacing; minor routing fixes |

