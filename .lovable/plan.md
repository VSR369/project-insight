

# Plan: Function 5 — `get_user_dashboard_data`

## What We're Building
A single SQL function returning a JSONB object with two arrays: `needs_action` and `waiting_for`.

## Schema Facts (Verified)
- `sla_timers` has `challenge_id`, `phase`, `deadline_at` columns — join on `challenge_id` AND `phase = current_phase`
- `get_user_all_challenge_roles` returns: `challenge_id, challenge_title, role_codes, current_phase, phase_status, master_status, operating_model`
- `get_phase_required_role` returns the role code for a given phase

## Function Logic

```sql
CREATE OR REPLACE FUNCTION public.get_user_dashboard_data(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
```

1. Loop over `SELECT * FROM get_user_all_challenge_roles(p_user_id)`
2. For each row, call `get_phase_required_role(current_phase)` → `v_required_role`
3. **If `v_required_role` is in `role_codes` AND `phase_status = 'ACTIVE'`** → append to `needs_action` array
4. **Else** → append to `waiting_for` array, with `waiting_for_role` set to `v_required_role` (or `'Solver submissions'` if NULL). Also LEFT JOIN `sla_timers` on `challenge_id + phase` to get `deadline_at`.
5. Return `jsonb_build_object('needs_action', needs_action_arr, 'waiting_for', waiting_for_arr)`

## SLA Timer Lookup
For `waiting_for` entries, query: `SELECT deadline_at FROM sla_timers WHERE challenge_id = rec.challenge_id AND phase = rec.current_phase LIMIT 1`

## Deliverable
Single migration file. No existing code modified.

