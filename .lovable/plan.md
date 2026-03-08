

# MOD-07 Gap Analysis

## CRITICAL Gaps

### GAP-1: MOD-07 Migration Overwrites MOD-06 RPCs with Incompatible Versions

The MOD-07 migration (`20260308132348`) runs AFTER the MOD-06 gap-fix migration (`20260308130158`) and **completely replaces** two critical RPCs with simplified, incompatible versions:

**`execute_auto_assignment`**:
- MOD-06 (correct, final): `(p_verification_id UUID, p_industry_segments UUID[], p_hq_country UUID, p_org_type TEXT, p_skip_admin_id UUID DEFAULT NULL)` — returns JSONB, has affinity check (BR-MPA-013), two-pass scoring, wildcard support, full candidate snapshot, workload management
- MOD-07 (overwrites): `(p_industry_segment_id UUID, p_hq_country_id UUID, p_org_type_id UUID, p_verification_id UUID, p_assignment_method TEXT DEFAULT 'auto')` — returns UUID, no affinity, no two-pass, no wildcard, no snapshot, no skip_admin_id, different param types (single UUID vs UUID[])

This destroys the entire MOD-02/MOD-06 auto-assignment engine. `bulk_reassign_admin` from MOD-06 calls the 5-param JSONB version — it will fail at runtime.

**`reassign_verification`**:
- MOD-06 (correct, final): `(p_verification_id, p_to_admin_id UUID DEFAULT NULL, p_reason, p_initiator, p_trigger, p_ip_address)` — supports directed reassignment, workload increment/decrement, uses `platform_admin_verifications` table
- MOD-07 (overwrites): `(p_verification_id, p_reason, p_initiator, p_ip_address)` — removes `p_to_admin_id` and `p_trigger`, uses `provider_verification_requests` table (wrong table), no workload management

The `useReassignVerification` hook passes `p_to_admin_id` and `p_trigger` — these params no longer exist, causing runtime failures.

**Fix**: The MOD-07 migration must NOT redefine `execute_auto_assignment` or `reassign_verification`. Instead, it should only UPDATE the config key references inside the existing MOD-06 versions. The correct approach is a new migration that uses `ALTER` or selective text replacement within the function bodies — or simply ensure the MOD-06 functions already use canonical keys (they currently reference `l1_weight`/`l2_weight`/`l3_weight` which no longer exist after MOD-07 renames them).

### GAP-2: Config Key Rename Breaks MOD-06 RPCs

MOD-07 renames keys: `l1_weight` → `domain_weight_l1_industry`, etc. But the MOD-06 `execute_auto_assignment` (the correct version in migration `20260308130158`) still reads `l1_weight`, `l2_weight`, `l3_weight`. After the rename, these lookups return NULL, defaulting to 50/30/20 hardcoded — which happens to be correct defaults but means config changes have no effect.

**Fix**: A new migration must re-create the MOD-06 `execute_auto_assignment` with the same full signature and logic but using canonical key names.

### GAP-3: Domain Weight Save Race Condition

`DomainWeightsPage` saves weights sequentially — L1, then L2, then L3. After saving L1, the server validates sum = 100. But L2 and L3 haven't been saved yet, so the sum will be wrong (e.g., new L1 + old L2 + old L3). The second and third saves will likely fail with `DOMAIN_WEIGHT_SUM_VIOLATION`.

**Fix**: Either (a) create a dedicated `update_domain_weights` RPC that accepts all three values atomically, or (b) temporarily disable sum validation during sequential saves by passing a `p_skip_sum_check` flag.

## HIGH Gaps

### GAP-4: Duplicate/Conflicting ExecutiveContactWarning Components

Two components serve the same purpose with different config keys:
- `src/components/admin/system-config/ExecutiveContactWarning.tsx` — checks `executive_escalation_contact_id` (correct)
- `src/components/admin/platform-admins/ExecutiveContactWarningBanner.tsx` — checks `executive_escalation_email` (wrong key, doesn't exist)

**Fix**: Remove `ExecutiveContactWarningBanner.tsx` or update it to reference `executive_escalation_contact_id`.

### GAP-5: `md_mpa_config` RLS Uses `is_supervisor` Column

The existing RLS policy `supervisor_modify_config` checks `is_supervisor = TRUE`, but the project has migrated to `admin_tier` column. If `is_supervisor` is deprecated or removed, supervisors cannot write config.

**Fix**: Update the RLS policy to use `admin_tier IN ('supervisor')` consistently.

### GAP-6: Audit Table RLS Allows Senior Admins

The `supervisor_select_config_audit` policy allows `admin_tier IN ('supervisor', 'senior_admin')` to read audit logs. The spec says SCR-07-01 is supervisor-only. This is permissive but should be verified against BRD intent.

## MEDIUM Gaps

### GAP-7: `useMpaConfig` Hook Uses `['mpa-config']` Query Key, `useUpdateConfig` Invalidates `['mpa-config']`

Both hooks are consistent, but `useSystemConfig` uses `['system-config']` query key and reads from `md_system_config` (a different table). The plan called for rewriting `useSystemConfig` to use `md_mpa_config`, but both hooks still exist separately. Code consuming `useSystemConfig` won't see MOD-07 params.

**Fix**: Verify which hook other modules consume. If they use `useSystemConfig` for config values, they need to be migrated to `useMpaConfig`.

### GAP-8: `ConfigParamRow` Doesn't Support UUID Picker for Executive Contact

The inline editor uses `<Input type="text">` for UUID params. The plan specifies an admin search dropdown for UUID type params (executive escalation contact). Currently a user would need to manually paste a UUID.

**Fix**: Add a UUID-type branch in `ConfigParamRow` that renders an admin selector dropdown when `param_type === 'UUID'`.

### GAP-9: No `leave_reminder_lead_time_days` Param in Seed

The seed data in the migration includes `leave_reminder_lead_time_days` (line 86), so this is present. However, no consuming code reads this param — it's seeded but unused.

---

## Implementation Plan

### Phase 1: Critical Database Fix (GAP-1, GAP-2, GAP-3)

Create a new migration that:
1. **Drops and re-creates `execute_auto_assignment`** using the MOD-06 full version (5 params, JSONB return, two-pass, affinity, skip_admin_id) but with canonical config keys (`domain_weight_l1_industry` etc.)
2. **Drops and re-creates `reassign_verification`** using the MOD-06 full version (6 params with `p_to_admin_id`, `p_trigger`, workload management, `platform_admin_verifications` table) but with canonical config key for max reassignments
3. **Creates `update_domain_weights` RPC** that accepts `(p_l1 INT, p_l2 INT, p_l3 INT, p_change_reason TEXT, p_ip_address TEXT)`, validates sum = 100 atomically, updates all three in one transaction, inserts three audit rows

### Phase 2: Frontend Fixes (GAP-3, GAP-4, GAP-8)

1. **`DomainWeightsPage`**: Replace three sequential `updateConfig.mutateAsync` calls with a single `supabase.rpc('update_domain_weights', ...)` call
2. **Create `useUpdateDomainWeights` hook** for the new RPC
3. **Delete `ExecutiveContactWarningBanner.tsx`** or update to use correct key
4. **`ConfigParamRow`**: Add admin selector dropdown when `param_type === 'UUID'`

### Phase 3: Cleanup (GAP-5, GAP-7)

1. Update `supervisor_modify_config` RLS to use `admin_tier = 'supervisor'`
2. Verify all consuming code uses correct hook (`useMpaConfig` vs `useSystemConfig`)

