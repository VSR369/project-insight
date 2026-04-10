
Updated diagnosis

- The current failure is no longer the old CR permission bug.
- I validated from the latest runtime evidence:
  - `initialize_challenge` succeeds
  - the large `PATCH /challenges` succeeds
  - a follow-up `GET /challenges` returns the saved values
  - then `POST /rpc/complete_phase` fails with: `record "v_next_config" has no field "sla_hours"`
- So “Submit to Curator” is failing inside the database phase-transition RPC, after the challenge content has already been saved.

Why it is still broken

1. `complete_phase` is broken
   - Current function (`supabase/migrations/20260409061646_c51beeb7-255e-4c9b-995e-756b449ac5e7.sql`) reads `v_next_config.sla_hours`
   - But `md_lifecycle_phase_config` is defined with `sla_days`, not `sla_hours` (`supabase/migrations/20260403091140_5c0625a1-224b-4e77-8c4f-8eeb2560f154.sql`)
   - That mismatch causes runtime error `42703`, so phase advancement aborts

2. The last `initialize_challenge` patch is incomplete and risky
   - The latest migration (`20260410140540_221d7294-c777-4542-bc3f-30b699ccf9eb.sql`) replaced `initialize_challenge` with a much simpler body
   - It adds CR, but it also drops earlier logic like:
     - tier-limit check
     - audit entries
     - SLA startup
     - AGG bypass behavior
     - `auto_assign_roles_on_creation`
   - That means the previous fix addressed one symptom, but may still regress QUICK/AGG and other flows

Persistence status

- Yes: your challenge data is being persisted before the submit crash
- Evidence: create succeeded, challenge update succeeded, and the saved challenge was immediately readable back from the DB
- The alt-tab protection code is also present:
  - `src/hooks/useAuth.tsx`
  - `src/contexts/OrgContext.tsx`
  - `src/pages/cogniblend/ChallengeCreatePage.tsx`
- So the main live issue now is phase transition failure, not data persistence loss

Implementation plan

1. Fix `complete_phase` at the root
   - Create a new migration that recreates `public.complete_phase`
   - Replace the SLA block from `v_next_config.sla_hours` to `v_next_config.sla_days`
   - Use day-based deadline calculation, e.g. `NOW() + make_interval(days => COALESCE(v_next_config.sla_days, 0))`
   - Keep the rest of the latest function logic intact

2. Repair `initialize_challenge` properly
   - Create a second migration that replaces the simplified latest function with a merged version based on the richer earlier implementation
   - Preserve:
     - tier-limit enforcement
     - governance resolution/normalization
     - audit trail insert
     - starting SLA timer
     - AGG phase-bypass behavior if still required
   - Preserve creator role assignment safely:
     - either restore `auto_assign_roles_on_creation` where that is the canonical path
     - or explicitly upsert CR while ensuring QUICK still gets the roles needed for auto-complete flows
   - Goal: fix CONTROLLED now without breaking QUICK/STRUCTURED behavior

3. Add one small frontend hardening improvement
   - In `src/hooks/cogniblend/useChallengeSubmit.ts`, improve the surfaced error for `complete_phase` failure so the user sees a clearer message if a DB RPC fails again
   - No submit-flow redesign is needed; the frontend sequence itself is correct

Validation after implementation

1. Re-test the exact failing path
   - CONTROLLED + MP creator → Submit to Curator
   - Expected: no DB error, challenge advances from phase 1 to phase 2

2. Verify persistence
   - enter data
   - alt-tab away/back
   - confirm values stay
   - submit
   - confirm the DB still contains the same saved fields

3. Run cross-mode sanity checks
   - QUICK + MP
   - QUICK + AGG
   - STRUCTURED + MP
   - STRUCTURED + AGG
   - CONTROLLED + MP
   - CONTROLLED + AGG
   - Especially verify QUICK auto-complete still works correctly

4. Confirm DB side-effects
   - `user_challenge_roles` contains the expected assignments
   - `challenges.current_phase` and `phase_status` advance correctly
   - `sla_timers` gets a valid `deadline_at`
   - no more `sla_hours` runtime errors

Expected outcome

- “Submit to Curator” works again
- The form data remains persisted
- The fix addresses the real current blocker instead of only the earlier CR symptom
