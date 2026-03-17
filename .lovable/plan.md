

# Plan: M-01-D — 4 Cross-Cutting Tables + Security Verification

## Tables to Create

All 4 are **new** — no existing equivalents.

| # | Table | Notes |
|---|-------|-------|
| 19 | `audit_trail` | **Append-only** (INSERT-only RLS). FK to `challenges(id)`, `solutions(id)`, `auth.users(id)`. Validation trigger for `method` column. |
| 20 | `legal_acceptance_ledger` | **Append-only** (INSERT-only RLS). FK to `challenges(id)`, `auth.users(id)`. Validation trigger for `tier`. |
| 21 | `sla_timers` | FK to `challenges(id)`. Validation trigger for `status`. Standard authenticated SELECT + INSERT. |
| 22 | `notifications` | FK to `challenges(id)`, `auth.users(id)`. Standard SELECT (user's own) + INSERT. |

## RLS Policies

- `audit_trail`: SELECT for authenticated, INSERT-only (no UPDATE/DELETE)
- `legal_acceptance_ledger`: SELECT for authenticated, INSERT-only (no UPDATE/DELETE)
- `sla_timers`: SELECT + INSERT + UPDATE for authenticated
- `notifications`: SELECT own rows (`user_id = auth.uid()`), INSERT for authenticated, UPDATE own rows (for marking read)

## Indexes

- `idx_audit_challenge_time` on `audit_trail(challenge_id, created_at DESC)`
- `idx_sla_status` on `sla_timers(challenge_id, status)`
- `idx_notifications_user` on `notifications(user_id, is_read, created_at DESC)`
- `idx_ucr_user_challenge` on `user_challenge_roles(user_id, challenge_id, is_active)`

## Verification

After creation, query all 22 CogniBlend tables to confirm existence, RLS enabled, and confirm INSERT-only policy on `audit_trail`, `solution_access_log`, and `legal_acceptance_ledger`.

## What Will NOT Be Done
- No existing tables modified
- No UI components created

