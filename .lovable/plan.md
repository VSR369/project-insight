

# Plan: Simplified AM Dashboard — Two Clean Sections

## Problem
The current dashboard has 7+ overlapping sections (AllRolesSummary, WhatsNextCard, ActionItemsWidget, NeedsActionSection, WaitingForSection, MyChallengesSection, OpenChallengesSection, Notifications, RecentActivity). For an Account Manager, this is overwhelming and confusing. Additionally:
- "View" buttons route to the wrong screen (edit wizard instead of detail)
- Curator's `AM_APPROVAL_PENDING` items don't appear in Action Items
- No status history or "with whom" visibility

## New Dashboard Layout

```text
┌─────────────────────────────────────────────────┐
│  Welcome Banner + Stats (simplified)            │
├─────────────────────────────────────────────────┤
│  SECTION 1: MY ACTION ITEMS                     │
│  Items that need YOUR action right now           │
│  - AM_APPROVAL_PENDING challenges (from Curator)│
│  - Drafts to complete                            │
│  - Returned items needing revision               │
│  Columns: Title, Phase, Status, With, SLA, Action│
├─────────────────────────────────────────────────┤
│  SECTION 2: MY REQUESTS (all submitted)          │
│  Every request you've created, with journey trail│
│  Columns: Title, Status, Current Phase,          │
│           With (role), SLA, Created               │
│  Expandable row → Status History Timeline        │
│    ├ Jan 15 — Submitted by you                   │
│    ├ Jan 16 — Sent to Challenge Architect        │
│    ├ Jan 18 — Spec Approved → Legal Coordinator  │
│    ├ Jan 20 — Legal Complete → Curator           │
│    └ Jan 22 — Curator sent for your approval     │
├─────────────────────────────────────────────────┤
│  Recent Notifications (keep, compact)            │
└─────────────────────────────────────────────────┘
```

## Changes

### 1. Redesign `CogniDashboardPage.tsx`
- **Remove**: `WhatsNextCard`, `NeedsActionSection`, `WaitingForSection`, `MyChallengesSection`, `OpenChallengesSection`, `RecentActivitySection`, `AllRolesSummaryWidget`
- **Keep**: Welcome banner (from ActionItemsWidget), stat cards, RecentNotificationsWidget
- **Render two sections**: `<MyActionItemsSection />` and `<MyRequestsTracker />`

### 2. Create `MyActionItemsSection.tsx` (new component)
Focused table showing only items the AM must act on NOW:
- **Data source**: Query `challenges` where user has active role AND (`phase_status = 'AM_APPROVAL_PENDING'` OR `master_status IN ('DRAFT', 'RETURNED')`)
- **Columns**: Title | Phase | Status | SLA | Action button
- **Action routing**:
  - `AM_APPROVAL_PENDING` → `/cogni/my-requests/:id/review` (Review & Approve)
  - `DRAFT` → `/cogni/challenges/:id/edit` (Continue Editing)
  - `RETURNED` → `/cogni/challenges/:id/edit` (Revise)
- **Empty state**: "All caught up! No items need your attention."

### 3. Create `MyRequestsTracker.tsx` (new component)
Table of ALL requests the AM has submitted, showing the full journey:
- **Data source**: Enhanced `useMyRequests` hook (add `phase_status` and `updated_at` to the select query)
- **Columns**: Title | Current Status | Phase | With (current owner role) | SLA | Created
- **"With" column logic**: Map `current_phase` → role name (Phase 1=You, Phase 2=Challenge Creator, Phase 3=Curator, Phase 4=Innovation Director, etc.)
- **Expandable row**: Click to expand and show status history timeline
  - Query `challenge_status_history` or `verification_assignment_log` for date + event entries
  - Each entry: date, event description, who/which role

### 4. Update `useMyRequests.ts`
- Add `phase_status, updated_at` to the select query
- Add `phase_status` to the `RequestRow` interface
- Remove the `current_phase <= 2` filter so ALL phases are visible (AM needs to see requests through the entire lifecycle)

### 5. Fix routing in ActionItemsWidget (keep for backward compat)
Replace the blanket `/cogni/challenges/:id/edit` route:
- `AM_APPROVAL_PENDING` → `/cogni/my-requests/:id/review`
- `PUBLISHED` or phase 7+ → `/cogni/challenges/:id` (ChallengeManagePage)
- `DRAFT` → `/cogni/challenges/:id/edit`
- Default → `/cogni/challenges/:id` (detail view, not edit wizard)

### 6. Clean up unused components
Remove imports and renders of `WhatsNextCard`, `NeedsActionSection`, `WaitingForSection`, `MyChallengesSection`, `OpenChallengesSection`, `RecentActivitySection` from the dashboard page. The component files themselves stay (other routes may use them).

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/CogniDashboardPage.tsx` | Strip down to Welcome + Stats + 2 sections + Notifications |
| `src/components/cogniblend/dashboard/MyActionItemsSection.tsx` | **New** — focused "needs your action" table with AM approval support |
| `src/components/cogniblend/dashboard/MyRequestsTracker.tsx` | **New** — all requests with expandable status history timeline |
| `src/hooks/queries/useMyRequests.ts` | Add `phase_status`, `updated_at`; remove phase<=2 filter |
| `src/components/cogniblend/dashboard/ActionItemsWidget.tsx` | Fix routing logic for View button |

