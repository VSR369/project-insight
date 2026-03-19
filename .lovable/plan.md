

# Fix: "column tenant_id of relation sla_timers does not exist"

## Root Cause

The `initialize_challenge` database function inserts into `sla_timers` with a `tenant_id` column, but that column doesn't exist on the table. The exception handler only catches `undefined_table`, not `undefined_column` (postgres error 42703), so the error propagates up and kills the entire challenge creation.

The AI spec generation succeeds (200 OK), but the subsequent `initialize_challenge` RPC call fails at the `sla_timers` INSERT, producing the "Failed to submit_solution_request" error.

## Fix

**Single database migration** that recreates `initialize_challenge` with the `tenant_id` removed from the `sla_timers` INSERT statement:

```sql
INSERT INTO public.sla_timers (
  challenge_id, phase, started_at, created_by  -- removed tenant_id
) VALUES (
  v_challenge_id, v_start_phase, NOW(), p_creator_id  -- removed v_tenant_id
);
```

Also widen the exception handler from `undefined_table` to `OTHERS` so any future schema drift in `sla_timers` doesn't block challenge creation.

No application code changes needed — this is purely a DB function fix.

