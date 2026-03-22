

# Plan: AM Approval Review Workflow for Marketplace Challenges

## Status: IMPLEMENTED ✅

## What Was Done

### 1. AM Challenge Review Page ✅
- New file: `src/pages/cogniblend/AMChallengeReviewPage.tsx`
- Route: `/cogni/my-requests/:id/review`
- Read-only challenge summary (title, problem statement, scope, deliverables, rewards)
- "Your Original Brief" section showing AM's original budget/timeline/expectations
- Previous decline history display
- **Approve** button → sets `phase_status = 'AM_APPROVED'`, calls `complete_phase`, notifies Curator
- **Decline** button → modal with reason textarea, sets `phase_status = 'AM_DECLINED'`, creates `amendment_records` (scope: `AM_DECLINED`), notifies Curator
- Audit trail entries for both actions

### 2. My Requests Page Updated ✅
- Added `PHASE_STATUS_BADGE_MAP` for AM workflow statuses:
  - `AM_APPROVAL_PENDING` → "Awaiting Your Approval" (amber)
  - `AM_DECLINED` → "Declined" (red)
  - `AM_APPROVED` → "Approved → ID Review" (green)
- Phase status badges take priority over master_status badges
- Rows with `AM_APPROVAL_PENDING` navigate to `/cogni/my-requests/:id/review`

### 3. CurationActions Decline Handling ✅
- When `phase_status === 'AM_DECLINED'`:
  - Alert banner showing decline reason, cycle number, and date
  - Submit button text changes to "Resubmit to Account Manager"
  - Clicking resubmit resets `phase_status` to `AM_APPROVAL_PENDING`
- AM decline cycles tracked separately via `scope_of_change = 'AM_DECLINED'` in `amendment_records`

### 4. Route Added ✅
- `/cogni/my-requests/:id/review` → `AMChallengeReviewPage` (lazy loaded)

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/AMChallengeReviewPage.tsx` | **New** — AM review page with Approve/Decline |
| `src/pages/cogniblend/CogniMyRequestsPage.tsx` | Phase status badges + review routing |
| `src/components/cogniblend/curation/CurationActions.tsx` | AM_DECLINED alert + resubmit flow |
| `src/App.tsx` | Added review route + lazy import |
