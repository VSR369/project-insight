

# MOD-02 Remaining Gaps Analysis

## Status: All 19 previously identified gaps were addressed, but the **RPC fix was never actually deployed**. The live `execute_auto_assignment` function still has the old code with all Critical gaps intact.

---

## CRITICAL: RPC Not Updated (GAPs 1-6 Still Present in Database)

The migration that was supposed to rewrite `execute_auto_assignment` either failed or was not applied. The live function still shows:

| Gap | Expected (from fix) | Actual (live DB) |
|-----|---------------------|------------------|
| **GAP-1: Two-Pass** | Pass 1 Available-only, then Pass 2 | Single-pass with both statuses together |
| **GAP-2: Wildcard scoring** | Half-weight for empty arrays | Binary (full or 0) |
| **GAP-3: Weight keys** | `l1_weight` (50/30/20) | `weight_industry_match` (40/30/30) — keys don't exist in config |
| **GAP-4: Round-robin** | `last_assignment_timestamp ASC` | `random()` tiebreaker |
| **GAP-5: Selection reason** | Derived reason per spec | Hardcoded `"Standard engine assignment"` |
| **GAP-6: Full snapshot** | All candidates JSONB array | Winner-only snapshot |

Additionally, the RPC references **wrong column names**:
- Uses `current_workload` / `max_workload` — actual columns are `current_active_verifications` / `max_concurrent_verifications`
- Uses `country_expertise` — actual column is `country_region_expertise`
- Does not update `last_assignment_timestamp` on assignment

This means the RPC will **fail at runtime** due to column mismatches.

---

## Moderate: UI/Edge Function Gaps Still Present

| Gap | Status | Detail |
|-----|--------|--------|
| GAP-8 | Partially fixed | Edge function passes org context but `assignment-engine` still expects caller to provide `org_name`, `industry_names`, etc. — no self-lookup |
| GAP-15 | Not rendered | Audit log table has no "Org Name" column in the actual `<TableHead>` |
| GAP-17 | Not applied | Fallback reason still free text, no CHECK constraint |

---

## Plan: Fix All Remaining Gaps

### Step 1: Database Migration — Rewrite RPCs with correct column names
- `execute_auto_assignment`: Two-pass logic, correct column refs (`current_active_verifications`, `max_concurrent_verifications`, `country_region_expertise`), wildcard scoring, `l1_weight`/`l2_weight`/`l3_weight` config keys, round-robin via `last_assignment_timestamp`, selection reason derivation, full candidate snapshot array, update `last_assignment_timestamp` on assign
- `get_eligible_admins_ranked`: Same column fixes + wildcard scoring + add missing return fields (`email`, `availability_status`, `current_active_verifications`, `max_concurrent_verifications`, `is_supervisor`)
- Add CHECK constraint on `open_queue_entries.fallback_reason`

### Step 2: UI — Add Org Name column to Audit Log table
- Add "Org Name" `<TableHead>` between Date/Time and Outcome
- Read from `snapshot.org_name`
- Include in CSV export (already partially done)

### Step 3: Edge Function — assignment-engine self-lookup (optional)
- Currently acceptable if callers provide data, but spec prefers self-contained lookup

**Estimated: 1 migration + 1 UI file edit.**

