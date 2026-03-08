

# Notification Delivery Audit Log — Figma Gap Analysis

## Current vs Figma Comparison

| # | Figma Design | Current Implementation | Status |
|---|-------------|----------------------|--------|
| 1 | **Title**: "Notification Delivery Audit Log" with subtitle "Monitor notification delivery status and retry attempts" | Title says "Notification Audit Log" with Bell icon, no subtitle | **Gap** — update title text, add subtitle, remove Bell icon |
| 2 | **Summary cards**: No icons, just label + large colored number (Total Today blue, Delivered green %, Retry Queued amber, Exhausted red) | Cards have icons beside text | **Gap** — remove icons, increase number size, add color to numbers, rename "Sent %" to "Delivered" |
| 3 | **Filter labels**: "Notification Type" label above dropdown showing "All"; "Status" label above dropdown showing "All" | No labels above dropdowns; dropdown text says "All Types" / "All Statuses" | **Gap** — add labels above each filter, simplify dropdown values to "All" |
| 4 | **Date filters**: labeled "From" and "To" above the date pickers with "dd-mm-yyyy" placeholder | No labels, placeholder says "From date" / "To date" | **Gap** — add labels, update placeholder format |
| 5 | **Recipient filter**: labeled "Recipient" above search input, placeholder "Search by email or name..." | No label, placeholder "Search recipient..." | **Gap** — add label, update placeholder |
| 6 | **Export CSV button**: inside the filter bar row (right side), not in the header | Button is in the header row beside the title | **Gap** — move Export CSV into the filter bar |
| 7 | **Timestamp column**: shows relative time AND absolute date (e.g., "2h ago" + "2026-03-06 03:45 PM") stacked | Only shows relative time | **Gap** — add absolute date below relative time |
| 8 | **Recipient column**: shows name AND email stacked (name bold, email muted below) | Shows only name or email, truncated | **Gap** — stack name + email |
| 9 | **Verification column**: shows org name + verification short ID (e.g., "Meridian Tech Solutions" + "V-2847") as a link | Shows truncated UUID with link icon | **Gap** — need org name display; may not have org_name in audit log data. Show verification_id as "V-XXXX" format |
| 10 | **In-App column**: shows colored badge (green "SENT", etc.) | Shows plain text with color | **Minor gap** — use badge component |
| 11 | **Re-send button**: styled as outlined red text button "Re-send" (not icon) | Icon-only button with RefreshCw | **Gap** — change to text button "Re-send" with red outline |
| 12 | **Expanded row detail**: shows "Provider ID: msg_1d2e3f", "Triggered By: SLA Monitor", "SMS Status: N/A", "Next Retry At: date" in a horizontal layout, plus red error message box | Current grid layout is close but missing "Next Retry At", error message not in red box | **Gap** — add "Next Retry At" field, style error message in red background box |
| 13 | **Pagination**: "Showing 5 of 47 notifications" left, numbered page buttons right | No pagination, loads all 200 | **Gap** — add client-side pagination with Figma-style footer |
| 14 | **Column header style**: lighter gray, smaller text | Standard styling | **Minor gap** — apply muted uppercase headers |

## Files to Change

### 1. `src/pages/admin/notifications/NotificationAuditLogPage.tsx`
- Update title to "Notification Delivery Audit Log" with subtitle, remove Bell icon
- Move Export CSV button out of header (will be in filters component)
- Add client-side pagination state (page, pageSize=5)
- Add pagination footer: "Showing X of Y notifications" left, numbered pages right

### 2. `src/components/admin/notifications/AuditSummaryCards.tsx`
- Remove icons from cards
- Color the number values (blue, green, amber, red)
- Rename "Sent %" to "Delivered"
- Increase number font size

### 3. `src/components/admin/notifications/NotificationAuditFilters.tsx`
- Add labels above each filter ("Notification Type", "Status", "From", "To", "Recipient")
- Change dropdown display values to "All" instead of "All Types" / "All Statuses"
- Update date placeholder to "dd-mm-yyyy"
- Update search placeholder to "Search by email or name..."
- Add Export CSV button at the end of the filter row

### 4. `src/components/admin/notifications/NotificationAuditTable.tsx`
- Timestamp: show relative time + absolute date stacked
- Recipient: stack name (bold) + email (muted) in one cell
- Verification: format as "V-XXXX" short code instead of UUID
- In-App status: use colored Badge instead of plain text
- Re-send: change from icon button to outlined red text "Re-send" button
- Expanded detail: add "Next Retry At" field, wrap error message in red background box
- Apply uppercase muted header styling

