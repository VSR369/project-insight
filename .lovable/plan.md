

# Project Knowledge Compliance Audit — Audit Log Modules

After reviewing all 8 files across the Assignment Engine Audit Log and Notification Delivery Audit Log, here are the compliance violations found against the Enterprise Architecture Reference standards.

---

## Violations Found

| # | File | Rule Violated | Issue | Severity |
|---|------|--------------|-------|----------|
| 1 | `useNotificationAuditLog.ts` | §24.1 Audit Fields | `useResendNotification` updates `updated_at` manually but **never sets `updated_by`** via `withUpdatedBy()` | **High** |
| 2 | `useNotificationAuditLog.ts` | §6.2 State Management | `useAuditSummary` is a plain function, not a hook — but named `use*`. This violates React naming conventions and is misleading. Should be a `useMemo`-based hook or renamed to `computeAuditSummary` | **Medium** |
| 3 | `AssignmentAuditLogPage.tsx` | §23 React Hooks Rules | Lines 207-269: `<>...</>` Fragment wrapping two `<TableRow>` elements inside `.map()` is **missing a `key` prop** on the Fragment. Should use `<Fragment key={log.id}>` | **High** |
| 4 | `AssignmentAuditLogPage.tsx` | §22.2 Naming | `handleExportCSV` uses mixed case — should be `handleExportCsv` per camelCase convention | **Low** |
| 5 | `NotificationAuditLogPage.tsx` | §7.2 Screen States | Error state does early return **before** hooks `useCallback`/`useMemo` for pagination (lines 71-77 vs 80-88). However, all hooks are actually called before line 71, so this is compliant. ✅ No issue. | — |
| 6 | `NotificationAuditTable.tsx` | §9.1 Responsive | Uses `lg:grid-cols-4` for expanded detail — ✅ Compliant | — |
| 7 | All files | §11.5 Console Usage | No `console.log/warn/error` found — ✅ Compliant | — |
| 8 | All query hooks | §6.3 React Query | Explicit column selects, proper `staleTime`/`gcTime`, proper `queryKey` — ✅ Compliant | — |

---

## Fixes

### 1. `src/hooks/queries/useNotificationAuditLog.ts` — Add audit field + rename function

**Fix A:** Import `withUpdatedBy` and use it in the `useResendNotification` mutation:
```typescript
const withAudit = await withUpdatedBy({
  email_status: 'PENDING',
  email_retry_count: 0,
  updated_at: new Date().toISOString(),
});
```

**Fix B:** Rename `useAuditSummary` to `computeAuditSummary` since it is not a React hook (contains no hook calls). This prevents confusion and linter false positives.

### 2. `src/pages/admin/AssignmentAuditLogPage.tsx` — Fix Fragment key

Replace `<>...</>` with `<Fragment key={log.id}>...</Fragment>` inside the `.map()` at line 207. Import `Fragment` from React.

### 3. `src/pages/admin/AssignmentAuditLogPage.tsx` — Rename handler

Rename `handleExportCSV` → `handleExportCsv` (lines 39, 167).

---

## Files to Change

| File | Changes |
|------|---------|
| `src/hooks/queries/useNotificationAuditLog.ts` | Add `withUpdatedBy` to resend mutation; rename `useAuditSummary` → `computeAuditSummary` |
| `src/pages/admin/notifications/NotificationAuditLogPage.tsx` | Update import from `useAuditSummary` → `computeAuditSummary` |
| `src/pages/admin/AssignmentAuditLogPage.tsx` | Add `Fragment` import + key prop; rename `handleExportCSV` → `handleExportCsv` |

