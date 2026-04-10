

## Integrated Fix: Submit to Curator — All 3 Bugs in One Migration

### Current state (verified from live DB)

| Bug | Status | Evidence |
|-----|--------|----------|
| Duplicate `initialize_challenge` overload | **LIVE** | 2 rows in `pg_proc` with different arg orders |
| `complete_phase` SLA: `sla_hours` reference | **Already fixed** | Live function uses `sla_days` correctly |
| `complete_phase` SLA: missing `role_code` | **Already fixed** | Live function includes `role_code` with `COALESCE` |
| `initialize_challenge` SLA: missing `role_code`/`deadline_at` | **Swallowed** | Exception block hides the failure — no SLA timer created for Phase 1 |
| `handle_phase1_bypass` wrong arg count | **LIVE** | Function requires 3 args, called with 1 |

### The blocker right now

**Bug 1 (duplicate overload)** is the primary blocker. PostgREST cannot resolve which `initialize_challenge` to call, so challenge creation fails immediately with "Could not choose the best candidate function". Nothing else runs.

### One migration to fix everything

**Step 1 — Drop the accidental duplicate signature**

```sql
DROP FUNCTION IF EXISTS public.initialize_challenge(uuid, text, uuid, text, text);
```

This removes the overload `(p_org_id, p_title, p_creator_id, p_governance_mode_override, p_operating_model)`.

**Step 2 — Recreate the canonical `initialize_challenge`**

Signature: `(p_org_id UUID, p_creator_id UUID, p_title TEXT, p_operating_model TEXT DEFAULT 'MP', p_governance_mode_override TEXT DEFAULT NULL)`

Merged fixes from both solutions:
- SLA timer insert includes `role_code` (from `required_role`, fallback `'CR'`) and `deadline_at` (from `sla_days`)
- `handle_phase1_bypass` called with correct 3 args: `(v_challenge_id, p_operating_model, TRUE)`
- Audit trail and role auto-assignment preserved
- Exception handling on non-critical blocks

**Step 3 — Recreate `complete_phase` with protective wrapping**

The current live function already has the `sla_days` and `role_code` fixes. Solution 1 adds a `BEGIN/EXCEPTION` wrapper around the SLA insert so timer failures never block phase advancement. This is a good hardening measure — adopt it.

### What changes

| Area | Change |
|------|--------|
| DB: `initialize_challenge` | Drop duplicate, recreate canonical with all fixes |
| DB: `complete_phase` | Add `BEGIN/EXCEPTION` wrapper around SLA insert (hardening only) |
| Frontend: `useChallengeSubmit.ts` | Add error mapping for "Could not choose the best candidate function" (optional hardening) |
| No other files change | |

### Technical details

The migration SQL combines:
1. `DROP FUNCTION` for the bad overload
2. `CREATE OR REPLACE FUNCTION public.initialize_challenge(...)` — the canonical version from Solution 1, which already includes all fixes from Solution 2
3. `CREATE OR REPLACE FUNCTION public.complete_phase(...)` — current live version + the `BEGIN/EXCEPTION` wrapper from Solution 1 around the SLA block

The `complete_phase` body is taken from Solution 1 since it matches the current live function but adds the protective exception handling. No logic changes — just crash protection.

### Validation

After deployment:
- Save Draft creates a challenge (no ambiguous RPC error)
- Submit to Curator advances from Phase 1 to Phase 2
- `sla_timers` row created with valid `role_code` and `deadline_at`
- AGG model correctly calls `handle_phase1_bypass` with 3 args
- Recursive auto-complete still works for QUICK mode

