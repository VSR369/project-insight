

# Plan: M-02 — CogniBlend Database Functions

## What We're Building

Two SQL functions (not edge functions) for role-based access control at the challenge level.

## Existing Schema (Verified)

- `user_challenge_roles`: has `user_id` (uuid), `challenge_id` (uuid), `role_code` (text), `is_active` (boolean)
- `challenges`: PK is `id` (not `challenge_id`), has `current_phase`, `phase_status`, `operating_model`

## Key Mapping

The prompt references `challenge_id` in the challenges query, but the actual PK column is `id`. The functions will use `challenges.id = p_challenge_id`.

## Functions

### Function 1: `can_perform`

```sql
CREATE OR REPLACE FUNCTION public.can_perform(
  p_user_id uuid, p_challenge_id uuid, p_required_role text, p_required_phase integer DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
```

Steps:
1. Check `user_challenge_roles` for active role match → false if not found
2. If `p_required_phase` is not null, check `challenges.id = p_challenge_id AND current_phase = p_required_phase AND phase_status = 'ACTIVE'` → false if not found
3. Model check: get `operating_model` from `challenges`. If role='AM' and model='AGG' → false. If role='RQ' and model='MP' → false.
4. Return true

Uses `SECURITY DEFINER` to bypass RLS (same pattern as existing `has_role` function).

### Function 2: `get_user_roles`

```sql
CREATE OR REPLACE FUNCTION public.get_user_roles(
  p_user_id uuid, p_challenge_id uuid
) RETURNS text[]
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
```

Returns `ARRAY(SELECT role_code FROM user_challenge_roles WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND is_active = true)`.

## Migration

Single migration file with both functions. No table modifications.

