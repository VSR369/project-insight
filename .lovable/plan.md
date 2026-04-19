

## Closing the Sprint 6 Gaps — Implementation Plan

Five focused changes to wire the existing utilities into live flows and add automated timeout enforcement. All net-additive; no existing behavior changes.

---

### Gap 1 — Wire `workflowNotifications` into FC, CR, CU, LC mutations

**Where to add the calls (fire-and-forget, on `onSuccess` after the mutation succeeds):**

| Caller | Hook / file | Notification | Recipient |
|---|---|---|---|
| FC confirms escrow | `EscrowManagementPage.tsx` (confirmEscrow.onSuccess) | `notifyEscrowConfirmed` | Curator(s) of the challenge |
| Creator accepts/edits/requests | `useCreatorReview.ts` | (none new — already logged) | — |
| Creator submits edits → Pass 3 stale | `useCreatorReview.ts` (submitEdits.onSuccess) | `notifyPass3Stale` | Curator (and LC if CONTROLLED) |
| Curator accepts Pass 3 | `useCuratorLegalReview.ts` (acceptPass3.onSuccess) | (no notification needed) | — |
| LC accepts Pass 3 | `useLcPass3Review.ts` (acceptPass3.onSuccess) | (no notification needed) | — |

Recipient lookup helper: add `src/lib/cogniblend/challengeRoleLookup.ts` (~50 lines) exporting `getActiveRoleUsers(challengeId, roleCode)` that queries `user_challenge_roles` for `role_code IN (...)` AND `is_active = true`. Used by callers to resolve curator/LC user ids before invoking notification helpers.

---

### Gap 2 — Mount `LcTimeoutConfigCard` in admin UI

Add a new section to `src/pages/admin/seeker-config/GovernanceModeConfigPage.tsx`:
- Below the existing `<GovernanceModeCard>` grid, render a new "Timeout Configuration" section.
- For STRUCTURED and CONTROLLED config rows, render `<LcTimeoutConfigCard>` with `currentTimeoutDays={config.lc_review_timeout_days}` and `onSave={(days) => updateTimeout(config.governance_mode, days)}`.
- Extend `useGovernanceModeConfig` SELECT_COLS to include `lc_review_timeout_days` (currently missing).
- Add an `updateLcTimeout` mutation in a new small hook `src/hooks/queries/useUpdateLcReviewTimeout.ts` (~50 lines) that calls `.update({ lc_review_timeout_days: days })` with `withUpdatedBy`, then invalidates `['governance-mode-config']`.

QUICK row is excluded (timeout doesn't apply).

---

### Gap 3 — Set `creator_approval_requested_at` when CR review opens

The timeout countdown can never fire because `creator_approval_requested_at` is never written. Fix in the existing `complete_phase` RPC (or wherever Phase 4 → CR_APPROVAL_PENDING transition occurs): when status flips to `CR_APPROVAL_PENDING`, also `UPDATE challenges SET creator_approval_requested_at = NOW(), creator_approval_status = 'pending'` if null.

Single new migration adds this update logic into `complete_phase` via `CREATE OR REPLACE FUNCTION` (preserving signature). Without this, Gap 4 cron has no anchor date.

---

### Gap 4 — `pg_cron` enforcement for LC + Creator timeouts

Two new edge functions + two cron jobs:

**Edge function `enforce-lc-timeout`** (~120 lines):
- Joins `challenges` (status = LC review pending) with `seeker_organizations.lc_review_timeout_days_override` (fallback to `md_governance_mode_config.lc_review_timeout_days`).
- For each row where `NOW() > phase_started_at + timeout_days * INTERVAL '1 day'` and no prior timeout notification:
  - Call `notifyLcReviewTimeout` (insert via service role).
  - Append a `challenge_status_history` row with `trigger_event = 'LC_REVIEW_TIMEOUT_REACHED'` (no status change — informational).

**Edge function `enforce-creator-approval-timeout`** (~120 lines):
- Selects challenges where `creator_approval_status = 'pending'` AND `creator_approval_requested_at + 7 days < NOW()`.
- Sets `creator_approval_status = 'timeout_override'`.
- Logs to `challenge_status_history` (role = SYSTEM, trigger = `CR_APPROVAL_TIMEOUT_OVERRIDE`).
- Calls `notifyCreatorApprovalTimeout`.

**pg_cron schedule (separate insert SQL, NOT a migration — contains anon key + URL):**
- Both jobs run hourly (`0 * * * *`).
- Use `net.http_post` to invoke each function.

---

### Gap 5 — Trim Sprint 2 edge function (optional cleanup)

`suggest-legal-documents/index.ts` (344 L) + `pass3Handler.ts` (422 L) = 766 L. Already split per spec; further extraction is low-value and risks regressing the working Pass 3 path. **Recommend deferring** unless a specific maintainability issue arises.

---

### Files

| # | File | Type | Est. Lines |
|---|---|---|---|
| 1 | `src/lib/cogniblend/challengeRoleLookup.ts` | CREATE | ~50 |
| 2 | `src/pages/cogniblend/EscrowManagementPage.tsx` | MODIFY | +12 |
| 3 | `src/hooks/cogniblend/useCreatorReview.ts` | MODIFY | +15 |
| 4 | `src/hooks/queries/useGovernanceModeConfig.ts` | MODIFY | +1 (add column) |
| 5 | `src/hooks/queries/useUpdateLcReviewTimeout.ts` | CREATE | ~50 |
| 6 | `src/pages/admin/seeker-config/GovernanceModeConfigPage.tsx` | MODIFY | +30 |
| 7 | Migration: `complete_phase` adds `creator_approval_requested_at` write | CREATE (SQL) | ~40 |
| 8 | `supabase/functions/enforce-lc-timeout/index.ts` | CREATE | ~120 |
| 9 | `supabase/functions/enforce-creator-approval-timeout/index.ts` | CREATE | ~120 |
| 10 | pg_cron schedule SQL (two `cron.schedule` calls, run via DB tool — not migration) | INSERT SQL | ~30 |

### Out of scope (deliberately)

- Restructuring/trimming `suggest-legal-documents` further.
- Backfilling `creator_approval_requested_at` for already-pending challenges (one-shot UPDATE can be added if needed).
- Surfacing the timeout-override state in any new UI (banner already handles `timeout_override` per Sprint 5).
- Email delivery for the new notifications (in-app `cogni_notifications` only — same convention as existing helpers).

### Safety guarantees

- Every notification call wrapped fire-and-forget; failures never block the parent mutation (matches existing helper contract).
- New cron jobs are idempotent (skip rows that already have a `LC_REVIEW_TIMEOUT_REACHED` history row, skip challenges already in `timeout_override`).
- `complete_phase` change is purely additive — only writes the new column when the status transition matches `CR_APPROVAL_PENDING`.
- QUICK challenges never reach CR approval / LC review states, so all paths remain inert for them.

