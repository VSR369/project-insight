

# Plan: `auto_assign_roles_on_creation` Function

## Function Signature
`public.auto_assign_roles_on_creation(p_challenge_id uuid, p_creator_id uuid, p_governance_profile text, p_operating_model text) RETURNS jsonb`

Properties: `SECURITY DEFINER`, `search_path = public`, PL/pgSQL.

## Logic

1. **LIGHTWEIGHT profile**: Build array of roles `['CR','CU','ID','ER','LC','FC']` + `'AM'` if MP or `'RQ'` if AGG. Loop and INSERT each into `user_challenge_roles` with `auto_assigned = true`. Log each to `audit_trail` with `method = 'SYSTEM'`, `action = 'ROLE_AUTO_ASSIGNED'`.

2. **ENTERPRISE profile**: Single role only — `'AM'` if MP, `'CR'` if AGG. Same insert + audit pattern.

3. **Return**: `{roles_assigned: [...], governance_profile: p_governance_profile, auto_assigned: true}`

## Key Decisions
- Direct INSERT (not calling `assign_role_to_challenge`) since auto-assignment at creation time has no pre-existing roles to conflict with, and we need `auto_assigned = true`.
- Uses `ON CONFLICT DO UPDATE` for idempotency (same pattern as existing functions).
- Single migration file, no existing code modified.

