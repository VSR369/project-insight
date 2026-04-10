

## Fix: complete_phase missing role_code in sla_timers INSERT

### Root Cause (confirmed from console logs + DB inspection)

The error is: `null value in column "role_code" of relation "sla_timers" violates not-null constraint`

The `complete_phase` function at line 160 inserts into `sla_timers` with only 5 columns:
```sql
INSERT INTO public.sla_timers (challenge_id, phase, started_at, deadline_at, status)
```

But `sla_timers.role_code` is `NOT NULL`. The insert crashes, rolling back the entire phase transition.

The `sla_hours` bug was already fixed in the current deployed function (it uses `sla_days` now). The user's root cause analysis references an older state. The **only remaining bug** is the missing `role_code`.

### Fix

**One database migration** — recreate `complete_phase` with the SLA insert line fixed to include `role_code`:

```sql
-- Line 160-162 changes from:
INSERT INTO public.sla_timers (challenge_id, phase, started_at, deadline_at, status)
VALUES (p_challenge_id, v_next_phase, NOW(), NOW() + make_interval(days => v_next_config.sla_days), 'ACTIVE')

-- To:
INSERT INTO public.sla_timers (challenge_id, phase, role_code, started_at, deadline_at, status)
VALUES (p_challenge_id, v_next_phase, COALESCE(v_next_config.required_role, 'SYS'),
        NOW(), NOW() + make_interval(days => v_next_config.sla_days), 'ACTIVE')
```

The `role_code` comes from the next phase's `required_role` in `md_lifecycle_phase_config`. Falls back to `'SYS'` if null (for auto-complete phases with no explicit role).

### Also check: initialize_challenge SLA insert

The `initialize_challenge` function may have the same missing `role_code` bug in its SLA timer insert. I'll verify and fix both in the same migration.

### No frontend changes needed

The frontend error handling already surfaces the constraint error correctly. Once the DB insert succeeds, the flow will work.

### Summary

| Change | Location | What |
|--------|----------|------|
| DB migration | `complete_phase` RPC | Add `role_code` to sla_timers INSERT |
| DB migration | `initialize_challenge` RPC | Same fix if applicable |

