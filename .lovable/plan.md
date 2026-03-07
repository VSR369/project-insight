

# Plan: Close 4 Minor MOD-04 Gaps

## Changes

### GAP-1: Add Date Range Filter
**File:** `src/components/admin/notifications/NotificationAuditFilters.tsx`
- Add `dateFrom` and `dateTo` fields to `AuditFilters` interface
- Add a date range picker using two Popover+Calendar components (Shadcn pattern with `pointer-events-auto`)
- Display as two date buttons ("From" / "To") in the filter row

**File:** `src/hooks/queries/useNotificationAuditLog.ts`
- Apply `.gte('created_at', dateFrom)` and `.lte('created_at', dateTo)` filters when set

**File:** `src/pages/admin/notifications/NotificationAuditLogPage.tsx`
- Update default `filters` state to include `dateFrom: null, dateTo: null`

### GAP-2: Add COURTESY_TIER2 / COURTESY_TIER3 Types
**File:** `src/components/admin/notifications/NotificationTypeBadge.tsx`
- Add `COURTESY_TIER2` (teal) and `COURTESY_TIER3` (teal, darker) entries to `TYPE_CONFIG`

**File:** `src/components/admin/notifications/NotificationAuditFilters.tsx`
- Add `COURTESY_TIER2` and `COURTESY_TIER3` to `TYPES` array

### GAP-3: Remove `as any` Casts
**File:** `src/hooks/mutations/useSendRegistrantMessage.ts`
- Remove `as any` on line 43 — types confirm the insert shape matches

**File:** `src/hooks/queries/useNotificationAuditLog.ts`
- Remove `as any` on line 83 — types confirm `email_status`, `email_retry_count`, `updated_at` exist on Update type

### GAP-4: Fix React Keys on Fragments
**File:** `src/components/admin/notifications/NotificationAuditTable.tsx`
- Replace bare `<>...</>` fragment (line 72) with `<Fragment key={row.id}>` to provide proper React keys

## Files Modified

| File | Gap |
|------|-----|
| `NotificationAuditFilters.tsx` | GAP-1, GAP-2 |
| `NotificationAuditLogPage.tsx` | GAP-1 |
| `useNotificationAuditLog.ts` | GAP-1, GAP-3 |
| `NotificationTypeBadge.tsx` | GAP-2 |
| `useSendRegistrantMessage.ts` | GAP-3 |
| `NotificationAuditTable.tsx` | GAP-4 |

