

# MOD-03: Verification Dashboard, Open Queue & SLA Engine — Full Implementation Plan

## Current State Assessment

**What exists:**
- `open_queue_entries` table (complete)
- `verification_assignments` table (complete)
- `verification_assignment_log` table (complete)
- `platform_admin_profiles` table (complete with all required columns)
- `admin_notifications` table (complete)
- `md_mpa_config` table (seeded with SLA thresholds)
- `execute_auto_assignment` and `get_eligible_admins_ranked` RPCs (fixed in MOD-02)
- `assignment-engine` and `notify-admin-assignment` edge functions

**What is completely missing (MOD-03 scope):**
- `platform_admin_verifications` table (THE core table)
- `verification_check_results` table (V1-V6 checks)
- `claim_from_queue` RPC (atomic claim with FOR UPDATE NOWAIT)
- `release_to_queue` RPC (release within 2hr window)
- `sla-escalation` edge function (3-tier SLA engine)
- `queue-escalation` edge function (unclaimed queue alerts)
- All 3 UI screens (SCR-03-01, SCR-03-02, SCR-03-03)
- All 3 modals (MOD-M-01, MOD-M-02, MOD-M-03)
- Sidebar navigation entry for "Verifications"
- All React Query hooks, routing, and shared components

---

## Implementation Plan — 7 Batches

### Batch 1: Database Schema (Migration)

Create the two missing core tables and two RPCs:

**Table: `platform_admin_verifications`**
- `id`, `organization_id` (FK to `seeker_organizations`), `assigned_admin_id` (FK to `platform_admin_profiles`, nullable), `assignment_method` (TEXT), `status` (TEXT: `Pending_Assignment`, `Under_Verification`, `Approved`, `Rejected`, `Returned_for_Correction`), `sla_start_at` (TIMESTAMPTZ), `sla_paused_duration_hours` (DECIMAL default 0), `sla_breached` (BOOLEAN default FALSE), `sla_breach_tier` (TEXT default 'NONE': NONE/TIER1/TIER2/TIER3), `sla_duration_seconds` (INTEGER, default from config), `reassignment_count` (INTEGER default 0), `completed_at`, `completed_by_admin_id`, `is_current` (BOOLEAN default TRUE), `created_at`, `updated_at`, `created_by`, `updated_by`
- Indexes: `idx_pav_assigned_admin`, `idx_pav_status`, `idx_pav_sla_breach`
- RLS: own-assignment SELECT, supervisor SELECT all, UPDATE only assigned admin

**Table: `verification_check_results`**
- `id`, `verification_id` (FK to `platform_admin_verifications`), `check_id` (TEXT: V1-V6), `result` (TEXT: Pass/Fail/Pending, default Pending), `notes` (TEXT nullable), `updated_by`, `updated_at`, `created_at`
- UNIQUE constraint on `(verification_id, check_id)`
- RLS: read by assigned admin + supervisor, write ONLY by assigned admin (BR-MPA-039)

**RPC: `claim_from_queue`** (SECURITY DEFINER)
- FOR UPDATE NOWAIT optimistic locking
- Atomic: update `open_queue_entries.claimed_by`, insert `verification_assignments`, update `platform_admin_verifications.assigned_admin_id`, insert audit log
- Returns `{success, claimed_by_name}` or `{error: 'ALREADY_CLAIMED'/'LOCK_CONFLICT'}`

**RPC: `release_to_queue`** (SECURITY DEFINER)
- Validates release window (claimed_at + configurable 2hr)
- Returns verification to open queue, inserts audit log
- Returns `{success}` or `{error: 'RELEASE_WINDOW_EXPIRED'}`

**Trigger: `fn_immutable_sla_start`**
- Prevents `sla_start_at` from being modified once set (BR-MPA-023/030)

**Trigger: `fn_sync_admin_workload`**
- On INSERT/UPDATE/DELETE of `verification_assignments`, recalculates `current_active_verifications` and auto-updates `availability_status` per BR-MPA-004

---

### Batch 2: Edge Functions

**`sla-escalation` edge function** (`supabase/functions/sla-escalation/index.ts`)
- Called by pg_cron with `{ tier: 1 | 2 | 3 }`
- Reads configurable thresholds from `md_mpa_config`
- Calculates SLA elapsed % accounting for `sla_paused_duration_hours`
- Tier 1: notify assigned admin only (in-app + email placeholder)
- Tier 2: notify assigned admin + ALL supervisors + registrant courtesy; set `sla_breached=true`
- Tier 3: auto-reassign via `execute_auto_assignment` with `p_supervisors_only=true`; if no match, pin CRITICAL to queue top
- Idempotent: only processes verifications not yet at this tier

**`queue-escalation` edge function** (`supabase/functions/queue-escalation/index.ts`)
- Called by pg_cron every 30 min
- Finds unclaimed queue entries > 4hr (configurable `queue_unclaimed_sla`)
- Checks `last_escalated_at` + repeat interval (2hr) to avoid spam
- Notifies all supervisors, increments `escalation_count`

---

### Batch 3: Shared UI Components

**`SLATimelineBar.tsx`** — Reusable gradient progress bar
- Props: `slaStartAt`, `slaPausedHours`, `slaDurationSeconds`, `breachTier`, tier thresholds from config
- Color zones: green (0-80%), amber (80-99%), red (100-149%), dark-red (150%+)
- Vertical needle at current %, deadline text below

**`SLAStatusBadge.tsx`** — Tier badge component
- No breach: hidden; T1: amber; T2: red; T3: dark-red CRITICAL

**`AssignmentMethodBadge.tsx`** — Grey badge
- AUTO_ASSIGNED / OPEN_QUEUE_CLAIMED / REASSIGNED / AFFINITY_ROUTING

**`ReleaseWindowCountdown.tsx`** — Countdown timer
- Shows remaining time in release window; hides after expiry

**`AssignedStateBanner.tsx`** — Amber/Red banner
- STATE 2: amber read-only banner with assigned admin name
- STATE 3: red blocked banner

---

### Batch 4: React Query Hooks

**`useMyAssignments.ts`** — Fetch current admin's assigned verifications
- Join `platform_admin_verifications` with `seeker_organizations`
- Filter: `assigned_admin_id = current_admin_id`, active statuses
- `staleTime: 30s`, `refetchInterval: 60s`

**`useOpenQueue.ts`** — Fetch unclaimed queue entries
- Join with organization data
- ORDER BY: `is_pinned DESC, is_critical DESC, sla_deadline ASC`
- `staleTime: 15s`

**`useVerificationDetail.ts`** — Single verification with state determination
- Fetches verification + check results + assignment history
- Determines STATE 1/2/3 based on `assigned_admin_id` vs current user + supervisor flag

**`useClaimFromQueue.ts`** — Mutation calling `claim_from_queue` RPC
**`useReleaseToQueue.ts`** — Mutation calling `release_to_queue` RPC
**`useUpdateCheckResult.ts`** — Auto-save mutation for V1-V6 checks
**`useVerificationAction.ts`** — Approve/Reject/Return mutations
**`useRequestReassignment.ts`** — Submit reassignment request to supervisors
**`usePinQueueEntry.ts`** — Supervisor pin/unpin mutation

---

### Batch 5: SCR-03-01 & SCR-03-02 — Verification Dashboard Page

**`VerificationDashboardPage.tsx`** — `/admin/verifications`
- Shared shell with two tabs controlled by `?tab=mine` | `?tab=queue`
- Conditional banners: amber T1 warning, red T2 breach (count-based)

**`MyAssignmentsTab.tsx`** (SCR-03-01)
- TanStack Table with columns: Org Name (bold link), Industry Tags (2 chips + "+N"), HQ Country (flag+name), SLA Status bar, SLA Deadline (date + countdown), Tier Badge, Days Remaining
- Default sort: `sla_elapsed_pct DESC`
- Empty state: "You have no active verifications. Great work!"
- Click row navigates to SCR-03-03

**`OpenQueueTab.tsx`** (SCR-03-02)
- Same column structure + Time in Queue, Claim button, CRITICAL badge, Pin indicator
- Supervisor can pin/unpin (icon button)
- Claim button opens MOD-M-01

**Sidebar navigation:** Add "Verifications" item under a new "Verification" group, visible to all admin tiers

---

### Batch 6: SCR-03-03 — Verification Detail Page

**`VerificationDetailPage.tsx`** — `/admin/verifications/:verificationId`
- Load verification, determine STATE (1=edit, 2=supervisor-readonly, 3=blocked)
- Breadcrumb: Verification Dashboard > [Org Name]
- Full-width SLA Timeline bar at top
- Org Summary card
- Tabs: Org Details | Verification Checks | Assignment History | Registrant Comms

**`VerificationChecksPanel.tsx`**
- V1-V6 check rows, `isEditable` prop controls STATE 1 vs 2/3
- STATE 1: Pass/Fail/Pending radios + notes textarea, auto-save on change
- STATE 2/3: read-only labels, grey background
- V6 guard: disabled until V1-V5 all non-Pending
- Per-check save indicator ("Saved" / "Saving...")
- Overall progress bar: X of 6 completed

**`ActionBar.tsx`** (STATE 1 only, fixed bottom)
- Approve (green, enabled when V6=Pass)
- Reject (red, always enabled)
- Return for Correction (amber)
- Request Reassignment (outline, disabled at max limit)
- Release to Queue (grey, visible only within 2hr window with countdown)

**`AssignmentHistoryTab.tsx`** — Timeline log table
- Columns: Date/Time, Event (colored badge), From Admin, To Admin, Reason/Method, Domain Score

---

### Batch 7: Modals

**`ClaimConfirmationModal.tsx`** (MOD-M-01)
- Org summary card, time in queue, SLA status with elapsed %
- Blue info box: "SLA clock does NOT reset"
- Confirm Claim button calls RPC; handles ALREADY_CLAIMED inline error

**`ReleaseToQueueModal.tsx`** (MOD-M-02)
- Release window countdown, reason textarea (min 20 chars)
- Confirm Release (red outline, disabled until valid)

**`RequestReassignmentModal.tsx`** (MOD-M-03)
- Reassignment count warning if at limit-1
- Reason textarea (min 20 chars)
- Optional target admin dropdown
- Submit Request button

---

## Technical Details

### State Determination Logic (SCR-03-03)
```text
currentAdminProfileId = profile.id WHERE user_id = auth.uid()
if (verification.assigned_admin_id === currentAdminProfileId) → STATE 1 (EDIT)
else if (profile.is_supervisor || profile.admin_tier === 'supervisor') → STATE 2 (READ-ONLY)
else → STATE 3 (BLOCKED)
```

### SLA Elapsed % Calculation (client-side)
```text
elapsed_seconds = (NOW - sla_start_at) - (sla_paused_duration_hours * 3600)
sla_elapsed_pct = (elapsed_seconds / sla_duration_seconds) * 100
```

### Route Registration
```text
/admin/verifications              → VerificationDashboardPage
/admin/verifications/:id          → VerificationDetailPage
```

### File Structure
```text
src/pages/admin/verifications/
├── VerificationDashboardPage.tsx
├── VerificationDetailPage.tsx
├── index.ts

src/components/admin/verifications/
├── MyAssignmentsTab.tsx
├── OpenQueueTab.tsx
├── VerificationChecksPanel.tsx
├── ActionBar.tsx
├── AssignmentHistoryTab.tsx
├── SLATimelineBar.tsx
├── SLAStatusBadge.tsx
├── AssignmentMethodBadge.tsx
├── AssignedStateBanner.tsx
├── ReleaseWindowCountdown.tsx
├── ClaimConfirmationModal.tsx
├── ReleaseToQueueModal.tsx
├── RequestReassignmentModal.tsx

src/hooks/queries/
├── useMyAssignments.ts
├── useOpenQueue.ts
├── useVerificationDetail.ts
├── useVerificationMutations.ts
```

### Estimated Scope
- 1 database migration (2 tables, 2 RPCs, 2 triggers, RLS policies, indexes)
- 2 edge functions (sla-escalation, queue-escalation)
- ~20 new frontend files
- Sidebar + routing updates

