

# Availability Screen Analysis & Enhancement Plan

## Current State

The **AvailabilitySettingsPage** currently shows:
- An info alert with active verification count
- A card with current status badge and a status selector (Available / On Leave)
- Leave date inputs (start/end) — these ONLY appear when "On Leave" is selected
- Immediate/Scheduled banners based on date selection

**What works:** If an admin is already On Leave, the page initializes with `On_Leave` selected and pre-populates the leave dates from the profile. So dates ARE shown — but only as editable fields inside the form, not as a clear informational display.

## Identified Issues

1. **No "Current Leave Period" summary** — When an admin IS on leave, there's no prominent read-only card showing "You are on leave from X to Y". The dates are buried in form inputs.
2. **Auto-calculated statuses not explained** — `Partially_Available` and `Fully_Loaded` are system-calculated but the page doesn't explain this. An admin at those statuses sees the selector offering only "Available" and "On_Leave" with no context about their current auto-status.
3. **No "Restore from Leave" prominent action** — An admin on leave has to manually switch the dropdown back to "Available". The Figma and BRD (MOD-M-08 RESTORE variant) show a clear "Restore to Available" button.
4. **My Profile page lacks quick leave-date visibility** — The profile page does show leave dates (lines 87-92), but only when `leave_start_date` exists. This part is actually correct.

## Plan

### Enhancement 1: Add Current Leave Summary Card

When the admin's profile status is `On_Leave`, show a prominent blue card at the top:

```
┌─────────────────────────────────────────────┐
│ 📅 Currently On Leave                       │
│                                             │
│ From: 10 Mar 2026    To: 20 Mar 2026        │
│ Duration: 10 days (5 remaining)             │
│                                             │
│ [Restore to Available]                      │
└─────────────────────────────────────────────┘
```

This replaces the need to read dates from form inputs.

### Enhancement 2: Auto-Status Explanation Banner

When the admin's status is `Partially_Available` or `Fully_Loaded`, show an explanatory info card:

```
Your status is auto-calculated based on workload:
• Partially Available — 7/10 verifications (above ideal threshold)
• You cannot manually change this. Reduce workload to return to Available.
```

### Enhancement 3: Restore Button for On Leave Admins

When on leave, show a dedicated "Restore to Available" button that triggers the existing `LeaveConfirmationModal` with `variant="restore"`. This is more discoverable than requiring the admin to change the dropdown.

### Files to Change

1. **`src/pages/admin/platform-admins/AvailabilitySettingsPage.tsx`** — Add the current leave summary card, auto-status explanation, and restore button. Restructure the page so that when on leave, the prominent action is "Restore", and when available, the action is "Go On Leave".

No new files needed. No database changes. This is purely a UX enhancement to make the existing data more visible and actionable.

