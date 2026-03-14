

# Show Leave Option Even When Status Is Auto-Calculated

## Problem
When `availability_status` is `Partially_Available` or `Fully_Loaded` (auto-calculated by the workload trigger), the entire status change card is hidden by the `!isAutoStatus` guard on line 248. This prevents the admin from going on leave or setting leave dates — which should always be possible regardless of workload status.

## Solution
Split the card into two concerns:
1. **Auto-status banner** (already exists) — explains why the status is auto-calculated (keep as-is)
2. **Leave action** — always visible, allowing the admin to schedule leave regardless of current workload status

### Changes to `src/pages/admin/platform-admins/AvailabilitySettingsPage.tsx`

- Remove the `!isAutoStatus` wrapper around the Card (line 248)
- When status is auto-calculated, hide the "New Status" dropdown but show a dedicated "Go On Leave" button/section instead
- When "Go On Leave" is clicked, reveal the leave date fields and save button
- The status dropdown only appears when status is `Available` (manual statuses)

### UI Flow

| Current Status | What user sees |
|---|---|
| `Available` | Status dropdown (Available / On Leave) + leave date fields when On Leave selected |
| `Partially_Available` / `Fully_Loaded` | Auto-status banner + "Schedule Leave" button → reveals date fields |
| `On_Leave` | Current leave summary card with restore button (unchanged) |

### Implementation Detail
- Add a `showLeaveForm` state boolean, toggled by a "Schedule Leave" button when `isAutoStatus` is true
- When `showLeaveForm` is true in auto-status mode, set `effectiveStatus` to `On_Leave` and show date inputs
- Save logic remains unchanged — it already handles On_Leave correctly

## File
| File | Change |
|---|---|
| `AvailabilitySettingsPage.tsx` | Remove `isAutoStatus` guard from Card; add "Schedule Leave" flow for auto-status admins |

