

# Fix: CA/CR "My Action Items" Should Show Lifecycle Actions, Not Requests

## Problem
Currently, for CA/CR roles, "My Action Items" shows Phase 2 SPEC_REVIEW challenges — the exact same items already listed in "Incoming Requests." This is redundant. Action items should instead surface actionable lifecycle events: returned challenges needing revision, notifications requiring attention (SLA warnings, role assignments, amendment notices), and approval-pending items.

## What Changes

### File: `src/components/cogniblend/dashboard/MyActionItemsSection.tsx`

**Remove** the `isPhase2SpecWork` logic (lines 109-113, 115, 119, 124) that adds incoming requests as action items for CA/CR roles.

**Add** unread `cogni_notifications` as action items for CA/CR roles. These are already stored in the DB and fetched by `NotificationBell`, but not surfaced in the action items widget. The section will query unread notifications for the current user and display them as actionable rows.

For CA/CR, action items will now include:
1. **RETURNED challenges** — challenges returned for modification (already works, just `master_status === 'RETURNED'`)
2. **Unread notifications** — SLA_BREACH, SLA_WARNING, AMENDMENT_NOTICE, curation_returned, PHASE_COMPLETE, WAITING_FOR_YOU, ROLE_ASSIGNED, etc.
3. **AM_APPROVAL_PENDING** items (if the CA/CR also holds AM role — already works)

**Specific changes:**
- Add a query for unread `cogni_notifications` (reuse the existing query key pattern from NotificationBell)
- Remove `isPhase2SpecWork` condition from the action items builder
- Map unread notifications into the action items array with appropriate status badges and routes (clicking navigates to the challenge view)
- Add new status badges: `SLA_BREACH`, `SLA_WARNING`, `AMENDMENT`, `NOTIFICATION`
- Add notification-specific route: navigate to `/cogni/my-requests/{challengeId}/view` or mark as read

**Table columns for notification-based items:**
- Title (notification title)
- Type (badge: SLA Breach, Amendment, etc.)
- Status (Unread)
- Action (View / Dismiss)

### No other files change
- `MyRequestsTracker` (Incoming Requests) stays unchanged — it correctly shows all assigned challenges
- AM/RQ action items logic stays unchanged
- NotificationBell continues to work independently

## Technical Details
- Reuses `cogni_notifications` table already populated by lifecycle hooks
- No new queries needed — just a direct `supabase.from('cogni_notifications')` select filtered to `is_read = false`
- Notification items and challenge-based items (RETURNED, DRAFT) merge into one unified list, sorted by recency
- Clicking a notification-based action item marks it as read and navigates to the challenge

