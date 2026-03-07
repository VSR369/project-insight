

# Plan: Implement MOD-04 — Notification Delivery & Communication

## Current State

**Exists:**
- `notification_audit_log` table — partially schema-matched (missing `recipient_type`, `recipient_name`, `triggered_by`, `in_app_status`, `email_status` (has `status` instead), `email_error_message`, `email_provider_id`, `updated_at`)
- `notification_retry_queue` table — exists with basic schema
- `registrant_communications` table — **DOES NOT EXIST**
- `notify-admin-assignment` edge function — writes to both tables
- `sla-escalation` edge function — exists for MOD-03
- RLS: supervisor-only SELECT on `notification_audit_log`, service-role-only on retry queue
- Verification Detail page has a stub "Registrant Comms" tab

**Does Not Exist:**
- SCR-04-01: Notification Delivery Audit Log page
- SCR-04-02: Registrant Communication Thread component
- `process-notification-retries` edge function
- `send-registrant-courtesy` edge function
- `useNotificationAuditLog` hook
- `useRegistrantThread` / `useSendRegistrantMessage` hooks
- Route `/admin/notifications/audit`
- Sidebar entry for Notification Audit

---

## Implementation Plan

### 1. Database Migration — Schema Alignment

**Alter `notification_audit_log`** to match spec (add missing columns):
```sql
ALTER TABLE notification_audit_log
  ADD COLUMN IF NOT EXISTS recipient_type TEXT NOT NULL DEFAULT 'ADMIN',
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS triggered_by TEXT,
  ADD COLUMN IF NOT EXISTS in_app_status TEXT NOT NULL DEFAULT 'SENT',
  ADD COLUMN IF NOT EXISTS email_error_message TEXT,
  ADD COLUMN IF NOT EXISTS email_provider_id TEXT,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- Rename 'status' to 'email_status' via new column + migration
ALTER TABLE notification_audit_log ADD COLUMN IF NOT EXISTS email_status TEXT NOT NULL DEFAULT 'PENDING';
-- Copy existing status data
UPDATE notification_audit_log SET email_status = status;
-- Add CHECK constraints
ALTER TABLE notification_audit_log ADD CONSTRAINT chk_nal_recipient_type
  CHECK (recipient_type IN ('ADMIN','REGISTRANT','SUPERVISOR','EXECUTIVE'));
ALTER TABLE notification_audit_log ADD CONSTRAINT chk_nal_in_app_status
  CHECK (in_app_status IN ('SENT','SKIPPED'));
ALTER TABLE notification_audit_log ADD CONSTRAINT chk_nal_email_status
  CHECK (email_status IN ('PENDING','SENT','FAILED','RETRY_QUEUED','EXHAUSTED'));
ALTER TABLE notification_audit_log ADD CONSTRAINT chk_nal_sms_status
  CHECK (sms_status IN ('NOT_SENT','SENT','FAILED'));
-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_nal_type_created ON notification_audit_log(notification_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nal_email_status ON notification_audit_log(email_status) WHERE email_status IN ('PENDING','RETRY_QUEUED');
```

**Create `registrant_communications` table:**
```sql
CREATE TABLE registrant_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id UUID NOT NULL REFERENCES platform_admin_verifications(id) ON DELETE RESTRICT,
  direction TEXT NOT NULL CHECK (direction IN ('OUTBOUND','INBOUND')),
  message_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  sent_by_admin_id UUID REFERENCES platform_admin_profiles(id) ON DELETE SET NULL,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  email_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (email_status IN ('PENDING','SENT','FAILED')),
  email_retry_count INTEGER NOT NULL DEFAULT 0,
  last_retry_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_rc_verification ON registrant_communications(verification_id, created_at ASC);
ALTER TABLE registrant_communications ENABLE ROW LEVEL SECURITY;
-- RLS: All authenticated admins can SELECT on verifications they can see
-- INSERT: assigned admin or supervisor only
```

**Seed test data** into `notification_audit_log` (10-15 rows with various types and statuses) so SCR-04-01 shows populated data.

### 2. Edge Functions

**`process-notification-retries`** — BR-MPA-046 retry processor:
- Fetches `notification_retry_queue` WHERE `status='PENDING' AND next_retry_at <= NOW()` LIMIT 100
- Marks entry `IN_PROGRESS` (distributed lock)
- Attempts email re-send (simulated for now — logs success)
- On success: update audit log `email_status='SENT'`, cancel retry queue entry
- On exhaustion (retry_count >= max_attempts): set `EXHAUSTED`, alert all active supervisors via `admin_notifications` insert
- On failure: schedule next retry at +15min, set `RETRY_QUEUED`

**`send-registrant-courtesy`** — BR-MPA-036:
- Input: `{ verification_id, tier: "TIER2" | "TIER3" }`
- Fetches org contact from `seeker_organizations`
- Idempotency: checks recent (30min) `registrant_communications` for same tier
- Builds privacy-safe email (no admin names, no SLA metrics)
- Inserts into `registrant_communications` + `notification_audit_log`
- Queues retry if email fails

### 3. SCR-04-01: Notification Delivery Audit Log Page

**Route:** `/admin/notifications/audit` — Supervisor only (TierGuard)

**Components:**
- `NotificationAuditLogPage.tsx` — page with AdminLayout breadcrumbs
- `NotificationAuditFilters.tsx` — 4 filters: Type dropdown, Status dropdown, Date range, Recipient search
- `NotificationAuditTable.tsx` — TanStack-style table with columns:
  - Timestamp (relative), Type badge (color-coded pill), Recipient, Verification (deep link), In-App status, Email Status badge, Retry Count ("2/3"), Last Retry (relative), SMS Status, Actions
- `NotificationTypeBadge.tsx` — 10 color-coded notification type badges
- `EmailStatusBadge.tsx` — 5 status variants (green/grey/amber/red/dark-red)
- Summary stat cards at top: Total Today, Sent %, Retry Queued count (amber), Exhausted count (red)
- Expandable row detail: provider ID, error message, full email, triggered_by, SMS status, retry queue info
- Re-send button on EXHAUSTED rows (resets retry cycle)
- EXHAUSTED rows highlighted with red tint
- Export CSV button
- Empty state + loading skeleton

**Hook:** `useNotificationAuditLog.ts` with filters, pagination, React Query

### 4. SCR-04-02: Registrant Communication Thread

**Replace the stub** in `VerificationDetailPage.tsx` "Registrant Comms" tab.

**Components:**
- `RegistrantCommThread.tsx` — full thread panel:
  - Fixed top blue info banner: "All messages here are visible to the registrant. Do not include internal admin names, SLA metrics, or escalation details."
  - Scrollable thread area with message bubbles:
    - System messages (left-aligned, grey bg): type badge, subject, body preview, delivery status
    - Admin manual messages (right-aligned, blue bg): admin name, subject, body, delivery status
  - Compose panel (bottom, fixed): Subject input (pre-filled "[Ref: ORG-NAME]"), body textarea with char count, Send button
  - Privacy keyword warning: client-side scan for "admin", "SLA", "escalation", "Tier", "breach" — amber inline warning (does NOT block send)
  - Compose panel visible only to assigned admin (STATE 1) or supervisors
  - Non-edit users see "Delivery warning banner" explaining read-only access
  - Empty state: "No communications have been sent to the registrant yet."

**Hooks:**
- `useRegistrantThread.ts` — React Query + Realtime subscription on `registrant_communications`
- `useSendRegistrantMessage.ts` — mutation: INSERT into `registrant_communications`, call send-registrant-courtesy edge fn for delivery

### 5. Sidebar & Routing

**AdminSidebar.tsx:** Add "Notification Audit" entry under Verification group (supervisor only)

**App.tsx:** Add route:
```tsx
<Route path="notifications/audit" element={
  <TierGuard requiredTier="supervisor"><NotificationAuditLogPage /></TierGuard>
} />
```

### 6. Update Existing Edge Functions

**`notify-admin-assignment`**: Update INSERT to use new columns (`recipient_type`, `recipient_name`, `email_status`, `in_app_status`, `triggered_by`)

**`sla-escalation`**: Add call to `send-registrant-courtesy` for Tier 2 and Tier 3 events

---

## Files to Create

| File | Purpose |
|------|---------|
| Migration SQL | Schema alignment + registrant_communications + seed data |
| `src/pages/admin/notifications/NotificationAuditLogPage.tsx` | SCR-04-01 page |
| `src/components/admin/notifications/NotificationAuditTable.tsx` | Audit log data table |
| `src/components/admin/notifications/NotificationAuditFilters.tsx` | Filter controls |
| `src/components/admin/notifications/NotificationTypeBadge.tsx` | 10 color-coded type badges |
| `src/components/admin/notifications/EmailStatusBadge.tsx` | 5 status badges |
| `src/components/admin/notifications/AuditSummaryCards.tsx` | Top stat cards |
| `src/components/admin/verifications/RegistrantCommThread.tsx` | SCR-04-02 thread |
| `src/hooks/queries/useNotificationAuditLog.ts` | Query hook with filters |
| `src/hooks/queries/useRegistrantThread.ts` | Thread query + Realtime |
| `src/hooks/mutations/useSendRegistrantMessage.ts` | Send message mutation |
| `supabase/functions/process-notification-retries/index.ts` | Retry processor edge fn |
| `supabase/functions/send-registrant-courtesy/index.ts` | Registrant courtesy edge fn |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/AdminSidebar.tsx` | Add "Notification Audit" under Verification (supervisor-only) |
| `src/App.tsx` | Add `/admin/notifications/audit` route |
| `src/pages/admin/verifications/VerificationDetailPage.tsx` | Replace comms stub with `RegistrantCommThread` |
| `supabase/functions/notify-admin-assignment/index.ts` | Use new audit log columns |
| `supabase/functions/sla-escalation/index.ts` | Add courtesy call for T2/T3 |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

