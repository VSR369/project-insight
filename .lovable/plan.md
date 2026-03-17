

# M-01 Test Checklist — Results (15 Tests)

| ID | Test | Status | Notes |
|---|---|---|---|
| T01-01 | All 22 tables exist | **PASS** | 184 public tables total. All 22 CogniBlend tables confirmed present (challenges, challenge_legal_docs, amendment_records, challenge_package_versions, solutions, evaluation_records, escrow_records, ip_transfer_records, solution_access_log, solver_profiles, dispute_records, rating_records, audit_trail, legal_acceptance_ledger, sla_timers, cogni_notifications, platform_roles, role_conflict_rules, user_challenge_roles, challenge_role_assignments, seeker_subscriptions, seeking_organizations). |
| T01-02 | platform_roles has 8 rows | **PASS** | 8 rows confirmed. Role codes: AM, RQ, CR, CU, ID, ER, LC, FC — all present. |
| T01-03 | role_conflict_rules seeded | **PARTIAL FAIL** | Only `SOFT_WARN` conflict type found (5 rows: CR+CU, CR+ID, CU+ID, CR+ER, ID+ER). No `ENTERPRISE_ONLY` type exists. The checklist expects CR+CU=SOFT_WARN (present) but also expects ENTERPRISE_ONLY (missing). |
| T01-04 | organizations has tier fields | **FAIL** | No `organizations` table exists. Closest equivalent is `seeker_subscriptions` or `seeking_organizations`, but neither has `subscription_tier`, `max_concurrent_active`, or `max_cumulative_quota` columns. |
| T01-05 | challenges has ALL columns | **PARTIAL FAIL** | Has: `complexity_score`, `complexity_level`, `ip_model`, `rejection_fee_percentage`, `phase_schedule`, `visibility`. Missing: `eligibility`. |
| T01-06 | solutions has encryption fields | **PASS** | `is_encrypted`, `encryption_key_ref`, `ai_usage_declaration` all present. |
| T01-07 | escrow_records has rejection_fee | **PASS** | `rejection_fee_percentage` column exists with DEFAULT 10. |
| T01-08 | solver_profiles has reputation | **PASS** | `verification_level`, `reputation_score`, `win_count`, `portfolio_visible` all present. |
| T01-09 | sla_timers exists | **PASS** | Table exists with `id` (mapped from `timer_id`), `deadline_at`, `breached_at` columns. |
| T01-10 | audit_trail INSERT ONLY | **PASS** | Only SELECT + INSERT policies. No UPDATE or DELETE policies. |
| T01-11 | solution_access_log INSERT ONLY | **PASS** | Only SELECT + INSERT policies. No UPDATE or DELETE policies. |
| T01-12 | legal_acceptance_ledger INSERT ONLY | **PASS** | Only SELECT + INSERT policies. No UPDATE or DELETE policies. |
| T01-13 | RLS enabled on all tables | **PASS** | All 22 CogniBlend tables confirmed `rowsecurity=true`. |
| T01-14 | Indexes exist | **FAIL** | `idx_ucr_user_challenge` does NOT exist on `user_challenge_roles`. Existing indexes are: `user_challenge_roles_pkey`, `idx_user_challenge_roles_challenge_role`, `idx_user_challenge_roles_user_active`. |
| T01-15 | FK constraint works | **NOT TESTED** | Read-only verification mode — INSERT test requires write access. FK constraints are defined in migration SQL. |

---

## Summary

| Result | Count |
|---|---|
| **PASS** | 10 |
| **PARTIAL FAIL** | 2 |
| **FAIL** | 2 |
| **NOT TESTED** | 1 |

## Failures Requiring Fixes

1. **T01-03**: Missing `ENTERPRISE_ONLY` conflict type in `role_conflict_rules` seed data.
2. **T01-04**: No `organizations` table with `subscription_tier`, `max_concurrent_active`, `max_cumulative_quota` columns. These may belong to a table not yet created in the CogniBlend schema (Tables 1-6 from the original Handbook may reference a different `organizations` table than `seeking_organizations`).
3. **T01-05**: `eligibility` column missing from `challenges` table.
4. **T01-14**: Index `idx_ucr_user_challenge` on `user_challenge_roles(user_id, challenge_id, is_active)` was not created.

## Recommended Fix Plan

A single migration to:
1. Add `eligibility text` column to `challenges`
2. Create index `idx_ucr_user_challenge` on `user_challenge_roles(user_id, challenge_id, is_active)`
3. Insert `ENTERPRISE_ONLY` conflict rules into `role_conflict_rules` (if spec defines the exact rows)
4. Create `organizations` table with tier fields OR add those columns to the appropriate existing table (needs clarification on which table the Handbook intends)

Shall I proceed with fixes for the 4 failing items?

