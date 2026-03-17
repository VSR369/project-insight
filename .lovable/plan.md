

# Plan: M-02 Functions 3 & 4

## Schema Note
The `challenges` table PK is `id` (not `challenge_id`). The `user_challenge_roles` table references it as `challenge_id`. Function 4's query will use `c.id` and return it aliased as `challenge_id`.

## Function 3: `get_phase_required_role(p_phase integer) RETURNS text`
- Pure CASE statement, no table access
- `IMMUTABLE SECURITY DEFINER`, `search_path = public`
- Maps phases 1-13 to role codes as specified, DEFAULT NULL

## Function 4: `get_user_all_challenge_roles(p_user_id uuid) RETURNS TABLE(...)`
- `STABLE SECURITY DEFINER`, `search_path = public`
- JOINs `user_challenge_roles ucr` ON `challenges c` using `ucr.challenge_id = c.id`
- Returns: `c.id AS challenge_id`, `c.title`, `array_agg(ucr.role_code)`, `c.current_phase`, `c.phase_status`, `c.master_status`, `c.operating_model`
- Filters: `ucr.user_id = p_user_id AND ucr.is_active = true`
- Groups by all non-aggregated columns

## Deliverable
Single migration file with both functions. No existing tables or code modified.

