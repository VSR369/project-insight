

# Cross-Module Integration Audit: MOD-01 through MOD-07

## Audit Methodology

Reviewed all 7 tech spec documents against the codebase: 206 migrations, 43 edge functions, 120+ hooks, and all admin UI components. Below are the findings organized by severity.

---

## CRITICAL Issues (System-Breaking)

### C-1: SLA Escalation Edge Function Uses Wrong Config Keys

**File:** `supabase/functions/sla-escalation/index.ts` (lines 34-46)

The function reads `sla_tier1_pct`, `sla_tier2_pct`, `sla_tier3_pct` from `md_mpa_config`. MOD-07 renamed these to `sla_tier1_threshold_pct`, `sla_tier2_threshold_pct`, `sla_tier3_threshold_pct`. The old keys no longer exist in the database, so the lookups return nothing and the function falls back to hardcoded defaults. This means **config changes to SLA thresholds via SCR-07-01 have no effect on the SLA engine**.

**Fix:** Update the edge function to use canonical keys: `sla_tier1_threshold_pct`, `sla_tier2_threshold_pct`, `sla_tier3_threshold_pct`.

### C-2: Queue Escalation Edge Function Uses Wrong Config Key

**File:** `supabase/functions/queue-escalation/index.ts` (line 31)

Reads `queue_escalation_repeat_hours` but MOD-07 renamed to `queue_escalation_interval_hours`. The old key no longer exists, so the repeat interval always falls back to the hardcoded default of 2 hours regardless of config changes.

**Fix:** Update to `queue_escalation_interval_hours`.

### C-3: Two Conflicting `execute_auto_assignment` Functions in Migration Order

**Migration 20260308132348 (MOD-07)** creates a simplified 5-param version (line 282) that uses `provider_verification_requests` table and returns UUID. **Migration 20260308133454 (gap fix)** creates the full MOD-06 version (line 7) that uses `platform_admin_verifications` table and returns JSONB.

Since the gap-fix runs AFTER, the correct version wins at deployment. However, the MOD-07 migration's simplified version still executes first during initial migration run, which:
- Creates verification_assignments records with wrong column names (`admin_id` vs `assigned_admin_id`, `status` vs `is_current`)
- References `provider_verification_requests` instead of `platform_admin_verifications`

If any data exists when these migrations run, the intermediate state could cause constraint violations. The MOD-07 migration's versions of `execute_auto_assignment` and `reassign_verification` should be **removed** from the MOD-07 migration file to prevent this.

### C-4: MOD-07's `reassign_verification` References Wrong Table

In migration `20260308132348` (line 421-424), the simplified `reassign_verification` reads from `provider_verification_requests` and writes to `verification_audit_log` (wrong table). The gap-fix corrects this by overwriting with the version that uses `platform_admin_verifications` and `verification_assignment_log`. Same risk as C-3: intermediate execution creates invalid data.

---

## HIGH Issues (Functional Gaps)

### H-1: SLA Edge Function Uses `executive_escalation_email` Instead of UUID

**File:** `supabase/functions/sla-escalation/index.ts`

The tech spec (MOD-07) specifies `executive_escalation_contact_id` (UUID FK to `platform_admin_profiles`). But the `sla-escalation` function still reads `executive_escalation_email` (a key that doesn't exist in the canonical seed). It should look up the admin profile by UUID and get the email from there.

### H-2: SLA Edge Function Supervisor Query Uses `is_supervisor` Only

**File:** `supabase/functions/sla-escalation/index.ts` (line 70)

Uses `.or("is_supervisor.eq.true,admin_tier.eq.supervisor")` which is defensive. Other edge functions like `bulk-reassign` use `.eq("admin_tier", "supervisor")` only. While the current approach works (belt-and-suspenders), the project is migrating away from `is_supervisor`. All edge functions should be consistent.

### H-3: `ExpertiseTags` Component Missing `forwardRef`

**Console:** Warning about function components not accepting refs in `PlatformAdminListContent`. The `ExpertiseTags` component is being passed a ref but doesn't use `React.forwardRef`. This is a runtime warning that indicates a potential interaction bug with tooltips.

### H-4: Missing `validate_domain_weights` RPC (API-07-03)

MOD-07 spec lists `API-07-03: validate_domain_weights` as a separate RPC artifact. The implementation merged this validation into `update_domain_weights`. While functionally equivalent, the spec calls for a separate validation-only RPC that could be used for client-side pre-validation without committing changes.

### H-5: `LEAVE_REMINDER` and `REGISTRANT_COURTESY` Missing from NotificationType

**File:** `src/hooks/queries/useAdminNotifications.ts` (line 11-18)

The TypeScript `NotificationType` union only includes 8 types but MOD-04 spec defines 10 types. Missing: `LEAVE_REMINDER` and `REGISTRANT_COURTESY`. This means filtering by these types will cause TypeScript errors.

---

## MEDIUM Issues (Consistency/Completeness)

### M-1: `md_mpa_config` Has Both `id UUID PK` and `param_key UNIQUE`

The tech spec (TABLE-07-01) defines `param_key TEXT PRIMARY KEY` (no separate UUID `id`). The implementation uses `id UUID PK` + `param_key` as a unique column. This doesn't break anything but adds unnecessary complexity and the UPSERT uses `ON CONFLICT (param_key)` which works correctly.

### M-2: `sla_duration` Seeded But Not in BRD's 14 Parameters

The MOD-07 migration seeds 16 parameters including `sla_duration` (line 87). The BRD specifies exactly 14. `sla_duration` was added pragmatically (used by SLA engine) but it's not in the spec and has no label/group alignment.

### M-3: `leave_reminder_lead_time_days` Seeded But Not Consumed

The parameter is correctly seeded but no code (pg_cron, edge function, or hook) reads it to trigger leave reminder notifications. This is a MOD-01/MOD-06 gap where the leave reminder notification system references this config key but the scheduled job to actually fire reminders doesn't exist yet.

### M-4: `sla-escalation` Edge Function Doesn't Use `get_config` RPC

MOD-07 spec states "All engines read via the `get_config` RPC which returns a typed map." The SLA and queue escalation edge functions read directly from the table using individual `.select()` queries instead of calling the `get_config` RPC. This works but bypasses the type-casting logic in the RPC.

### M-5: `ScorePreviewTable` Uses `useAllAdminProfiles` Which May Not Exist

The `DomainWeightsPage` spec calls for a live preview table using admin expertise data. Need to verify `useAllAdminProfiles` hook exists and returns the required `industry_expertise`, `country_region_expertise`, `org_type_expertise` arrays.

### M-6: Sidebar "System Config" Not in "Settings" Group

The spec implies System Config should be under a "Settings" group in the sidebar, but it's placed in the generic `settingsItems` array alongside "Question Bank" and "Regression Test Kit". This is acceptable but could be cleaner.

---

## LOW Issues (Minor)

### L-1: MOD-04 `process-notification-retries` Uses Defensive Supervisor Query
Uses `.or("is_supervisor.eq.true,admin_tier.eq.supervisor")` — acceptable but inconsistent with `bulk-reassign` which uses `.eq("admin_tier", "supervisor")`.

### L-2: Some Edge Functions Still Reference `console.error`
Files like `sla-escalation/index.ts` use `console.error` for Deno logging, which is appropriate for edge functions (not client-side). No action needed.

---

## Implementation Plan

### Phase 1: Critical Edge Function Config Key Alignment (C-1, C-2, H-1, H-2)

1. **Update `sla-escalation/index.ts`**:
   - Change `sla_tier1_pct` → `sla_tier1_threshold_pct` (and T2, T3)
   - Change `executive_escalation_email` → `executive_escalation_contact_id` and add UUID lookup for admin email
   - Standardize supervisor query to use `admin_tier`

2. **Update `queue-escalation/index.ts`**:
   - Change `queue_escalation_repeat_hours` → `queue_escalation_interval_hours`

### Phase 2: Migration Cleanup (C-3, C-4)

3. **Remove the simplified `execute_auto_assignment` and `reassign_verification` from migration `20260308132348`** (lines 280-489). These are overwritten by the gap-fix migration anyway, but their intermediate execution could cause issues on fresh deployments. Replace with a comment: "-- RPCs restored in gap-fix migration".

### Phase 3: TypeScript & UI Fixes (H-3, H-5)

4. **Add `React.forwardRef` to `ExpertiseTags`** component
5. **Add missing notification types** (`LEAVE_REMINDER`, `REGISTRANT_COURTESY`) to `NotificationType` union

### Phase 4: Optional Spec Alignment (H-4, M-3, M-5)

6. Optionally create `validate_domain_weights` as a read-only pre-check RPC
7. Verify `useAllAdminProfiles` hook exists for `ScorePreviewTable`

---

## Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 4 | Must fix — edge functions using wrong config keys will silently ignore config changes |
| HIGH | 5 | Should fix — functional gaps and type mismatches |
| MEDIUM | 6 | Nice to fix — consistency improvements |
| LOW | 2 | Cosmetic |

**The most urgent fixes are C-1 and C-2**: the SLA and queue escalation edge functions are reading config keys that no longer exist after MOD-07's rename. This means any changes supervisors make to SLA thresholds or queue timing on SCR-07-01 will have zero effect on the actual engines. The hardcoded fallback defaults happen to match the original values, masking the bug.

