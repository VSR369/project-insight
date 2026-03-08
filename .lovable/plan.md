

# MOD-07: System Master Data & Configuration — Implementation Plan

## Current State Assessment

The existing `md_mpa_config` table has a **simplified schema** (only `id`, `param_key`, `param_value`, `description`, timestamps, audit fields). MOD-07 requires:
- Schema upgrade with 8 new columns (`param_type`, `param_group`, `label`, `unit`, `min_value`, `max_value`, `is_critical`, `requires_restart`, `updated_by_id`)
- New `md_mpa_config_audit` table (immutable append-only)
- Two new RPCs (`update_config_param`, `get_config`)
- Two new UI screens (SCR-07-01, SCR-07-02)
- Three new hooks (`useSystemConfig` rewrite, `useUpdateConfig`, `useConfigAuditLog`)
- Persistent warning banner in AdminShell when executive escalation contact is NULL
- Seed data alignment (14 BRD parameters with correct keys)

**No existing UI pages or routes exist for `/admin/system-config`.**

---

## Phase 1: Database Migration

### 1.1 Schema Upgrade — `md_mpa_config`

ALTER the existing table to add missing columns:
- `param_type TEXT NOT NULL DEFAULT 'TEXT'` with CHECK constraint (`INTEGER`, `DECIMAL`, `TEXT`, `UUID`, `BOOLEAN`)
- `param_group TEXT NOT NULL DEFAULT 'GENERAL'`
- `label TEXT NOT NULL DEFAULT ''`
- `unit TEXT` (nullable — `%`, `hours`, `days`, `count`)
- `min_value TEXT`, `max_value TEXT`
- `is_critical BOOLEAN DEFAULT FALSE`
- `requires_restart BOOLEAN DEFAULT FALSE`
- `updated_by_id UUID REFERENCES platform_admin_profiles(id)`

### 1.2 Seed Data Alignment

UPDATE existing rows to match BRD §8 param_keys and INSERT missing params. The 14 canonical keys:

| param_key | Default | Group |
|-----------|---------|-------|
| `domain_weight_l1_industry` | 50 | DOMAIN_WEIGHTS |
| `domain_weight_l2_country` | 30 | DOMAIN_WEIGHTS |
| `domain_weight_l3_org_type` | 20 | DOMAIN_WEIGHTS |
| `default_max_concurrent_verifications` | 10 | CAPACITY |
| `partially_available_threshold` | 80 | CAPACITY |
| `minimum_admins_available` | 1 | CAPACITY |
| `queue_unclaimed_sla_hours` | 4 | QUEUE |
| `queue_escalation_interval_hours` | 2 | QUEUE |
| `admin_release_window_hours` | 2 | QUEUE |
| `sla_tier1_threshold_pct` | 80 | SLA_THRESHOLDS |
| `sla_tier2_threshold_pct` | 100 | SLA_THRESHOLDS |
| `sla_tier3_threshold_pct` | 150 | SLA_THRESHOLDS |
| `executive_escalation_contact_id` | NULL | ESCALATION |
| `max_reassignments_per_verification` | 3 | REASSIGNMENT |
| `leave_reminder_lead_time_days` | 1 | REASSIGNMENT |

Map old keys to new (e.g., `l1_weight` → `domain_weight_l1_industry`, `tier1_threshold` → `sla_tier1_threshold_pct`). Update all consuming RPCs (`execute_auto_assignment`, `reassign_verification`, edge functions) to use canonical keys.

### 1.3 RLS Policies

- `mpa_config_read`: SELECT for supervisors (`is_supervisor = TRUE`)
- `mpa_config_write`: UPDATE blocked (`USING (FALSE)`) — all writes via RPC

### 1.4 New Table — `md_mpa_config_audit`

```text
id              UUID PK
param_key       TEXT NOT NULL
previous_value  TEXT (nullable for seed)
new_value       TEXT NOT NULL
changed_by_id   UUID NOT NULL FK → platform_admin_profiles
changed_at      TIMESTAMPTZ DEFAULT NOW()
change_reason   TEXT (optional)
ip_address      TEXT (optional)
```

RLS: INSERT only via service role (RPC). SELECT for supervisors. No UPDATE/DELETE policies.
Indexes: `idx_audit_key (param_key, changed_at DESC)`, `idx_audit_who (changed_by_id, changed_at DESC)`.

### 1.5 RPC — `update_config_param` (API-07-01)

SECURITY DEFINER function with:
1. Supervisor auth check
2. Param existence check with `FOR UPDATE` row lock
3. Type validation (INTEGER cast, UUID cast + existence check)
4. Range validation (min_value/max_value bounds)
5. **Domain weight sum validation**: L1+L2+L3 must = 100 (BR-MPA-014)
6. **SLA tier ordering**: T1 < T2 < T3
7. UUID reference validation (executive contact must exist in `platform_admin_profiles`)
8. NULL accepted for UUID type (clearing executive contact)
9. Atomic: UPDATE config + INSERT audit in one transaction
10. Returns JSONB `{ success, param_key, new_value }` or `{ success: false, error, detail }`

### 1.6 RPC — `get_config` (API-07-02)

STABLE SECURITY DEFINER function returning typed JSONB map via `jsonb_object_agg` with type casting per `param_type`. Called by all consuming engines at invocation time.

### 1.7 Key Alignment — Update Consuming RPCs

Update all existing references to old param_keys:
- `l1_weight` → `domain_weight_l1_industry`
- `l2_weight` → `domain_weight_l2_country`
- `l3_weight` → `domain_weight_l3_org_type`
- `max_reassignments` → `max_reassignments_per_verification`
- `release_window_hours` → `admin_release_window_hours`
- Edge functions: `queue_unclaimed_sla_hours`, `queue_escalation_repeat_hours` → canonical keys

---

## Phase 2: React Hooks

### 2.1 Rewrite `useSystemConfig` (API-07-04)

Query `md_mpa_config` with full schema (`SELECT *`), ordered by `param_group`. Returns typed array with all metadata columns. `staleTime: 60s`.

### 2.2 New `useUpdateConfig` (API-07-05)

Mutation calling `update_config_param` RPC with `paramKey`, `newValue`, `changeReason`, `ipAddress` (via existing `getClientIP()`). Invalidates `['system-config']` and `['config-audit']` on success. Error handling for `DOMAIN_WEIGHT_SUM_VIOLATION`, `SLA_TIER_ORDER_VIOLATION`, `INVALID_REFERENCE`, `BELOW_MINIMUM`, `ABOVE_MAXIMUM`.

### 2.3 New `useConfigAuditLog` (API-07-06)

Query `md_mpa_config_audit` joined with `platform_admin_profiles` for changed_by name. Ordered `changed_at DESC`. Optional `paramKey` filter. `staleTime: 30s`.

---

## Phase 3: UI — SCR-07-01 System Configuration Dashboard

**Route**: `/admin/system-config` (Supervisor only via TierGuard)

### Layout
1. **Executive Escalation Warning Banner** (conditional) — Red alert at top when `executive_escalation_contact_id` IS NULL. "Configure now →" links to the ESCALATION section.

2. **Two Tabs**: "Parameters" (default) | "Audit History"

3. **Parameters Tab** — Six accordion sections:
   - **Domain Match Weights**: Read-only badges (L1=50, L2=30, L3=20) + "Configure on SCR-07-02 →" link
   - **Admin Capacity**: 3 param rows (Default Max Concurrent, Partially Available Threshold, Min Admins Available)
   - **Open Queue**: 3 param rows (Unclaimed SLA, Escalation Interval, Release Window)
   - **SLA Escalation**: 3 param rows (T1, T2, T3) + SLA ordering bar visualization
   - **Escalation Routing**: Executive Contact UUID picker (admin search dropdown)
   - **Reassignment & Leave**: 2 param rows (Max Reassignments, Leave Reminder)

4. **Parameter Row** — Inline edit pattern:
   - Label (bold) + current value badge (blue, with unit) + info tooltip + critical badge (red, if `is_critical`)
   - Edit mode: numeric stepper (INTEGER) or admin search dropdown (UUID), change reason textarea, Save/Cancel
   - "Last changed: [Name] — [relative time]" sub-line

5. **Audit History Tab** — Table with columns: Timestamp, Parameter (label), Previous Value, New Value, Changed By, Reason. Ordered newest first. Empty state: "No changes recorded."

### 3.1 Persistent Warning in AdminShell Header

Add a compact red warning bar to `AdminHeader` when executive escalation contact is NULL. Links to `/admin/system-config`. Visible to supervisors only.

---

## Phase 4: UI — SCR-07-02 Domain Match Weights Tuning Panel

**Route**: `/admin/system-config/domain-weights` (Supervisor only)

### Layout
1. **Breadcrumb**: System Config → Domain Match Weights
2. **Impact Note Banner** (amber): "Weight changes affect the next auto-assignment. Existing assignments are unaffected."
3. **Weight Sliders Panel**:
   - Three horizontal sliders (0–100) for L1, L2, L3 with value badges
   - Live sum display: "50 + 30 + 20 = 100 ✓" (green) or "95 (must equal 100)" (red)
   - "Reset to defaults (50/30/20)" link
   - Change reason textarea (optional)
   - Save Weights (disabled until sum = 100) / Cancel
4. **Live Score Preview Panel**:
   - Three dropdowns: Industry, HQ Country, Org Type (from master data)
   - Preview table: all active admins ranked by current slider values (client-side `computePreviewScore`)
   - Columns: Rank, Admin Name, L1 Score, L2 Score, L3 Score, Total, Change (↑/↓/―)
   - "Current vs Proposed" comparison with rank change arrows
   - Amber warning if top admin demoted by 2+ positions

### Client-Side Score Logic
```text
L1 = admin has industry match ? weights.l1 : 0
L2 = exact country match ? weights.l2 : wildcard '*' ? 50% of weights.l2 : 0
L3 = org type match ? weights.l3 : 0
Total = L1 + L2 + L3
```

Computed via `useMemo` — no server calls per slider move. Uses `useAllAdminProfiles` hook for admin expertise arrays.

---

## Phase 5: Routing & Navigation

1. Add routes to `App.tsx`:
   - `/admin/system-config` → `SystemConfigPage` (TierGuard `supervisor`)
   - `/admin/system-config/domain-weights` → `DomainWeightsPage` (TierGuard `supervisor`)

2. Add "System Config" link to `AdminSidebar` (supervisor only, with Settings icon)

3. Add persistent escalation contact warning to `AdminHeader`

---

## New Files

```text
supabase/migrations/XXXXXXXX_mod07_system_config.sql
  - ALTER md_mpa_config (add columns)
  - CREATE md_mpa_config_audit
  - CREATE update_config_param RPC
  - CREATE get_config RPC
  - Seed 14 BRD params (UPSERT)
  - Update consuming RPCs to use canonical keys
  - RLS policies

src/hooks/queries/useSystemConfig.ts          (rewrite)
src/hooks/queries/useUpdateConfig.ts          (new)
src/hooks/queries/useConfigAuditLog.ts        (new)

src/pages/admin/system-config/
  SystemConfigPage.tsx                         (SCR-07-01)
  DomainWeightsPage.tsx                        (SCR-07-02)

src/components/admin/system-config/
  ConfigParamRow.tsx                           (inline edit row)
  ConfigGroupAccordion.tsx                     (accordion section)
  AuditHistoryTable.tsx                        (audit tab)
  ExecutiveContactWarning.tsx                  (red banner)
  SlaOrderingBar.tsx                           (T1→T2→T3 visualization)
  WeightSliders.tsx                            (L1/L2/L3 sliders)
  ScorePreviewTable.tsx                        (live ranking preview)

src/components/admin/AdminHeader.tsx           (edit — add warning)
src/components/admin/AdminSidebar.tsx          (edit — add nav item)
src/App.tsx                                    (edit — add routes)
src/integrations/supabase/types.ts             (edit — add RPC types)
```

---

## BRD Rules Coverage

| Rule | Implementation |
|------|---------------|
| BR-MPA-014 | L1+L2+L3=100 enforced client-side (Save disabled) + server-side (`update_config_param` DOMAIN_WEIGHT_SUM_VIOLATION) |
| BR-MPA-001 | `minimum_admins_available` configurable, consumed by DB trigger |
| BR-MPA-004 | `partially_available_threshold` configurable |
| BR-MPA-005 | `leave_reminder_lead_time_days` configurable |
| BR-MPA-021 | Queue timing params configurable |
| BR-MPA-024 | `admin_release_window_hours` configurable |
| BR-MPA-033/034/035 | SLA tier thresholds configurable with T1<T2<T3 ordering validation |
| BR-MPA-037 | All three tier thresholds configurable as system master data |
| BR-MPA-045 | `max_reassignments_per_verification` configurable |
| §8 Executive Fallback | NULL contact → all supervisors receive Tier 3. Persistent warning until set |

## Edge Cases Covered

EC-07-01 through EC-07-10 handled via: client-side validation (sum, range), server-side RPC guards (type, range, sum, tier ordering, UUID existence), FOR UPDATE row locking (concurrent edits), NULL handling for executive contact, advisory warning for min_admins mismatch.

