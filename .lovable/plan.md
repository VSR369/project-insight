

# Plan: M-01-C — 8 Solution Lifecycle Tables

## Schema Mapping

All 8 tables are **new** — no existing equivalents found. Existing tables like `solution_providers` (enrollment), `interview_evaluations` (interview scoring), and `solver_profile_views` (view tracking) serve different purposes.

**FK mapping** (prompt uses `users` and `challenges` aliases):
- `REFERENCES users` → `REFERENCES auth.users(id)` (existing pattern)
- `REFERENCES challenges` → `REFERENCES challenges(id)` (existing PK is `id`, not `challenge_id`)

## Tables to Create

| # | Table | Purpose |
|---|-------|---------|
| 11 | `solutions` | Solver submissions per challenge |
| 12 | `evaluation_records` | Reviewer scores and rubrics |
| 13 | `escrow_records` | Payment escrow per challenge (UNIQUE on challenge_id) |
| 14 | `ip_transfer_records` | IP ownership transfer tracking |
| 15 | `solution_access_log` | Append-only audit of who accessed solutions |
| 16 | `solver_profiles` | CogniBlend solver reputation/stats (distinct from `solution_providers`) |
| 17 | `dispute_records` | Dispute lifecycle tracking |
| 18 | `rating_records` | Post-challenge mutual ratings |

## RLS Policies

- All tables: authenticated SELECT
- `solution_access_log`: **INSERT only** — no UPDATE/DELETE policies
- Other tables: INSERT restricted to relevant user (e.g., `provider_id = auth.uid()`, `reviewer_id = auth.uid()`, `raised_by = auth.uid()`)
- CHECK constraints implemented via **validation triggers** (per Supabase guidelines)

## Indexes

- `idx_solutions_challenge` on `solutions(challenge_id, provider_id)`
- `idx_evaluation_records_solution` on `evaluation_records(solution_id, reviewer_id)`
- `idx_escrow_records_challenge` on `escrow_records(challenge_id)`
- `idx_solution_access_log_solution` on `solution_access_log(solution_id, timestamp)`
- `idx_dispute_records_challenge` on `dispute_records(challenge_id, status)`
- `idx_rating_records_challenge` on `rating_records(challenge_id)`

## What Will NOT Be Done
- No existing tables modified
- No UI components created
- TypeScript types will be regenerated automatically after migration

