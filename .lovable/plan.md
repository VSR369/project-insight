

# Plan: AM Approval Review Workflow for Marketplace Challenges

## Current Gap

The Curator can send challenges to AM (`AM_APPROVAL_PENDING` status), but there is **no UI for the AM to review, approve, or decline**. No decline→discuss→resubmit loop exists.

## Workflow Design

```text
Curator completes curation
  │
  ├── Toggle ON (AM approval required)
  │     │
  │     ▼
  │   AM sees challenge in "My Requests" with status "Awaiting Your Approval"
  │     │
  │     ├── AM clicks → AM Review Page (/cogni/my-requests/:id/review)
  │     │     │
  │     │     ├── APPROVE → phase advances to Innovation Director
  │     │     │              (auto-assign ID from pool, complete_phase)
  │     │     │
  │     │     └── DECLINE → phase_status = 'AM_DECLINED'
  │     │                    Notification sent to Curator with reason
  │     │                    Curator sees "Declined by AM" status
  │     │                    Curator discusses/adjusts, resubmits to AM
  │     │                    (re-enters AM_APPROVAL_PENDING)
  │     │
  │     └── Loop until AM approves → then to Innovation Director
  │
  └── Toggle OFF
        │
        ▼
      Direct to Innovation Director (existing flow)
```

## Changes

### 1. New Page: AM Challenge Review (`/cogni/my-requests/:id/review`)

**New file: `src/pages/cogniblend/AMChallengeReviewPage.tsx`**

A read-only review page for the Account Manager showing:
- Challenge summary card (title, problem statement, scope, deliverables — read-only)
- "Original Brief" section showing what the AM originally submitted
- "Curator's Enhancements" section showing what was added/changed
- Two action buttons: **Approve** and **Decline** (with reason textarea)
- If previously declined, show the decline history with reasons

On **Approve**:
- Set `phase_status = 'AM_APPROVED'`
- Call `complete_phase` to advance to Innovation Director
- Auto-assign ID from pool
- Notify Curator of approval
- Audit trail entry

On **Decline**:
- Set `phase_status = 'AM_DECLINED'`
- Store decline reason in `amendment_records` (initiated_by: 'AM', scope: 'AM_DECLINED')
- Notify Curator with decline reason
- Audit trail entry

### 2. Update My Requests Page to Show AM Approval Items

**File: `src/pages/cogniblend/CogniMyRequestsPage.tsx`**

- Add `AM_APPROVAL_PENDING` to the status badge map as "Awaiting Your Approval" (amber badge)
- Add `AM_DECLINED` as "Declined" (red badge)
- Add `AM_APPROVED` as "Approved → ID Review" (green badge)
- When row has `phase_status = 'AM_APPROVAL_PENDING'`, clicking navigates to `/cogni/my-requests/:id/review` instead of edit page
- Query must include `phase_status` in the select

### 3. Update CurationActions to Handle Decline State

**File: `src/components/cogniblend/curation/CurationActions.tsx`**

- When `phase_status === 'AM_DECLINED'`, show:
  - Alert banner: "Declined by Account Manager" with the decline reason
  - Button changes to "Resubmit to Account Manager" (re-sends to `AM_APPROVAL_PENDING`)
  - Curator can still edit sections before resubmitting
- Track AM review cycles (separate from the existing 3-cycle amendment counter for creator returns)

### 4. Add Route

**File: `src/App.tsx`**

- Add route: `/cogni/my-requests/:id/review` → `AMChallengeReviewPage`

### 5. Update Sidebar Badge

**File: `src/components/cogniblend/shell/CogniSidebarNav.tsx`** (if badge logic exists)

- "My Requests" badge should count challenges with `AM_APPROVAL_PENDING` status for AM users

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/AMChallengeReviewPage.tsx` | **New** — AM review page with Approve/Decline actions |
| `src/pages/cogniblend/CogniMyRequestsPage.tsx` | Add AM approval status badges, route to review page |
| `src/components/cogniblend/curation/CurationActions.tsx` | Handle AM_DECLINED state, resubmit flow |
| `src/App.tsx` | Add `/cogni/my-requests/:id/review` route |

