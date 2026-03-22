
# Plan: Simplified AM Dashboard — IMPLEMENTED

## Summary
Consolidated 7+ overlapping dashboard sections into a clean two-section layout:

1. **My Action Items** — Focused table showing only items needing immediate action (DRAFT, RETURNED, AM_APPROVAL_PENDING)
2. **My Requests Tracker** — All submitted requests with expandable status history timeline from audit_trail

## Changes Made
- `CogniDashboardPage.tsx` — Stripped to: Welcome banner + Stats + Action Items + Requests Tracker + Notifications
- `MyActionItemsSection.tsx` — New component with smart phase-aware routing
- `MyRequestsTracker.tsx` — New component with expandable audit trail timeline
- `useMyRequests.ts` — Added `phase_status`, `updated_at`; removed `phase <= 2` filter
- `ActionItemsWidget.tsx` — Fixed View routing: phase-aware instead of blanket `/edit`
