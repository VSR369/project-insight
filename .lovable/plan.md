

# Plan: M-01-A — Core CogniBlend Tables (Mapped to Existing Schema)

## Existing Table Mapping

None of the 6 requested tables exist yet. However, several existing tables serve overlapping purposes that we must integrate with — not duplicate:

| Requested Table | Existing Equivalent | Decision |
|---|---|---|
| `platform_roles` | `md_slm_role_codes` (12 roles with R2-R10 codes) | **Create `platform_roles`** as the CogniBlend-specific role registry using AM/RQ/CR/CU/ID/ER/LC/FC codes. Keep `md_slm_role_codes` untouched — it serves the existing SLM assignment system. |
| `organizations` | `seeker_organizations` (full org schema with 40+ columns) | **Do NOT create a new `organizations` table.** Instead, **add missing columns** (`governance_profile`, `operating_model`, `max_concurrent_active`, `max_cumulative_quota`) to `seeker_organizations`. The existing table already has `organization_name`, `tenant_id`, `is_active`, `created_at`. |
| `users` | `profiles` (id, user_id, email, first_name, last_name) | **Do NOT create a new `users` table.** `profiles` already references `auth.users` and has email/name fields. The prompt's `users.org_id` FK is handled by `org_users` (existing join table). |
| `user_org_roles` | `role_assignments` (org_id, role_code, user_id, status) | **Do NOT create a new `user_org_roles` table.** `role_assignments` already maps users to org-level roles with the same fields. |
| `user_challenge_roles` | `challenge_role_assignments` (challenge_id, role_code, pool_member_id) | **Create `user_challenge_roles`** as a new table. The existing `challenge_role_assignments` references `platform_provider_pool` members (external providers), while `user_challenge_roles` tracks internal org users assigned to challenge governance roles. Different concern. |
| `role_conflict_rules` | Does not exist | **Create new.** |

## What Will Be Created/Modified

### New Tables (2)
1. **`platform_roles`** — 8-row lookup table with AM/RQ/CR/CU/ID/ER/LC/FC codes, `applicable_model` (MP/AGG/BOTH), RLS enabled
2. **`role_conflict_rules`** — 5 seed rules for CR+CU, CR+ID, CU+ID, CR+ER, ID+ER conflicts with SOFT_WARN / ENTERPRISE_ONLY

### New Table (1)
3. **`user_challenge_roles`** — Per-challenge role assignments for internal org users, with `auto_assigned` flag, composite PK `(user_id, challenge_id, role_code)`, FK to `platform_roles`

### Schema Extensions (1)
4. **`seeker_organizations`** — Add 4 columns:
   - `governance_profile` text (LIGHTWEIGHT/ENTERPRISE), default 'LIGHTWEIGHT'
   - `operating_model` text (MP/AGG), default 'MP'
   - `max_concurrent_active` integer, default 1
   - `max_cumulative_quota` integer, default 5

### NOT Created (3 tables skipped — existing equivalents used)
- ~~`organizations`~~ → use `seeker_organizations`
- ~~`users`~~ → use `profiles` + `org_users`
- ~~`user_org_roles`~~ → use `role_assignments`

### RLS Policies
- `platform_roles`: Authenticated SELECT (read-only lookup)
- `user_challenge_roles`: Authenticated SELECT all; INSERT where `user_id = auth.uid()` or user has admin role
- `role_conflict_rules`: Authenticated SELECT (read-only lookup)

### Seed Data
- 8 platform roles (AM, RQ, CR, CU, ID, ER, LC, FC)
- 5 conflict rules (all SOFT_WARN, ENTERPRISE_ONLY, SAME_CHALLENGE)

### Indexes
- `user_challenge_roles`: index on `(challenge_id, role_code)`, index on `(user_id, is_active)`

## Technical Notes
- `user_challenge_roles.challenge_id` will be a uuid FK to `challenges(id)` (existing table)
- `user_challenge_roles.user_id` will FK to `profiles(id)` (not `auth.users` directly, per Supabase guidelines)
- All tables get `created_at`, `updated_at` audit fields
- No UI components will be created

