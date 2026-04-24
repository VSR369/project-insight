# Submit & Publish (QUICK mode) — Diagnosis & Fix

## Root cause

A migration on 2026‑04‑23 (`20260423141721_…` and a near‑identical sibling) **rewrote `public.complete_phase`** with column references that don't exist on `md_lifecycle_phase_config`:

- `v_phase_config.allowed_role_codes` — column doesn't exist (real column is `required_role` / `secondary_role`)
- `v_phase_config.is_terminal` — column doesn't exist
- `p_creator_id` — undefined identifier inside the role‑grant block (the parameter is `p_user_id`); swallowed by `EXCEPTION WHEN OTHERS THEN NULL`

The rewrite also **dropped the auto‑complete recursion** that previously cascaded QUICK mode through phases 2 → 3 → 4 (Publication) in a single call. Phases 2, 3, 4 are configured with `auto_complete = true` for QUICK precisely so a Creator pressing **Submit & Publish** lands at "Published" without any Curator/LC/FC actions.

## Evidence

- DB inspection: `md_lifecycle_phase_config` has columns `required_role, secondary_role, auto_complete, gate_flags, sla_days, …` — no `allowed_role_codes`, no `is_terminal`.
- The user's three most recent QUICK challenges (`99f2e2ae…`, `41ffb2d6…`, `ab681fa6…`) are stuck at `current_phase = 1, phase_status = ACTIVE`.
- Their `audit_trail` shows `CHALLENGE_CREATED` + `ROLE_AUTO_ASSIGNED` (CR/CU/ER/LC/FC) but **zero `PHASE_COMPLETED` / `PHASE_ADVANCED` rows** — the RPC errors before reaching the audit insert.
- Submit hook (`useChallengeSubmit.ts`) calls `complete_phase` exactly once and surfaces the error as `"Phase transition failed: column \"allowed_role_codes\" does not exist"` → user sees a generic toast, challenge stays in draft state.

## What we'll do

### 1) New migration: restore the working `complete_phase`
Re-apply the version from migration `20260410151153_…` (lines 388–end of that file's `complete_phase`) which:
- Uses the correct columns (`required_role`, `gate_flags`, `auto_complete`, `sla_days`).
- Marks current phase `COMPLETED`, audits, closes its SLA timer.
- Advances `current_phase`, sets Phase 4 → `phase_status = 'PUBLISHED'`, stamps `published_at`, sets `challenge_visibility = 'public'`.
- Runs Phase 3 setup (auto‑apply legal docs, escrow row when `mandatory_escrow`).
- **Recursively auto‑completes** the next phase whenever `auto_complete = true` or the same role owns it. This is what makes QUICK mode go 1 → 2 → 3 → 4 in a single call.
- Returns `{ completed, previous_phase, current_phase, phases_auto_completed: [...] }`.

We will keep the few good additions made in the broken version (e.g. clearing `creator_approval_status`) where they don't conflict with the recursion.

### 2) Heal the three stuck QUICK challenges
After the function is fixed, run a one‑off update inside the migration to call `complete_phase` for each of the three challenges currently stuck at phase 1 so they land at the correct published state. (Backfill is bounded to those three IDs and audited.)

### 3) Frontend — surface real errors
Tighten `useChallengeSubmit.ts` so RPC errors are not silently squashed:
- Detect `phaseError` AND inspect `phaseResult.success === false` (the function returns structured `{ success: false, error: '…' }` for several validation paths) and throw with that message.
- After success, check `phases_auto_completed` and treat any QUICK challenge that didn't reach `current_phase = 4` as a failure surfaced to the user.

No frontend behavior change beyond clearer toasts; the success path still ends in the existing "Challenge published!" screen.

## Files touched

- `supabase/migrations/<new>__restore_complete_phase.sql` — new migration restoring the function and healing the 3 stuck rows.
- `src/hooks/cogniblend/useChallengeSubmit.ts` — error/result handling tightened, no signature change.

## Verification (after apply)

1. Create a new QUICK challenge as `nh-solo@testsetup.dev`, fill required fields, click **Submit & Publish**.
2. Expect: success toast → published‑success screen.
3. DB check: `current_phase = 4`, `phase_status = 'PUBLISHED'`, `published_at` set, `challenge_visibility = 'public'`, audit_trail contains `PHASE_COMPLETED` (×4) + `PHASE_ADVANCED` (×3).
4. The three previously stuck challenges should now show `current_phase = 4` and appear under "Published" in My Challenges.

## Out of scope

- Other `complete_*` wrappers (`complete_curator_compliance`, etc.) — they only delegate to `complete_phase` and will start working again automatically once the underlying function is fixed.
- The broader pre‑existing TS errors in `review-challenge-sections/index.ts` (separate ticket).
