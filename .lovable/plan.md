

# Plan: `validate_role_assignment` Function

## Schema Verified
`role_conflict_rules` has: `role_a`, `role_b`, `conflict_type`, `applies_scope`, `governance_profile` (all `text`), plus `is_active` (boolean).

## Function: `validate_role_assignment(p_user_id uuid, p_challenge_id uuid, p_new_role text, p_governance_profile text) RETURNS jsonb`

- `STABLE SECURITY DEFINER`, `search_path = public`
- PL/pgSQL with a loop over existing active roles, querying `role_conflict_rules` for conflicts
- Priority: HARD_BLOCK → SOFT_WARN (with governance profile logic) → ALLOWED
- Single migration file, no existing code modified

## Logic Summary
1. Fetch `array_agg(role_code)` from `user_challenge_roles` for active roles
2. Loop each existing role, query `role_conflict_rules` matching `(role_a, role_b)` in either order, `applies_scope = 'SAME_CHALLENGE'`, `is_active = true`
3. HARD_BLOCK → return `{allowed: false, conflict_type: 'HARD_BLOCK', message: ...}`
4. SOFT_WARN + `governance_profile IN ('BOTH','ENTERPRISE_ONLY')` + `p_governance_profile = 'ENTERPRISE'` → return `{allowed: true, conflict_type: 'SOFT_WARN', message: ...}`
5. SOFT_WARN + `p_governance_profile = 'LIGHTWEIGHT'` → return `{allowed: true, conflict_type: 'ALLOWED', message: null}`
6. No conflicts → return `{allowed: true, conflict_type: 'ALLOWED', message: null}`

