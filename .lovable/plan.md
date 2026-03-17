

# Plan: Execute M-03 Test Checklist (10 Tests)

## Context
Testing `validate_role_assignment`, `assign_role_to_challenge`, and `reassign_role` functions. The tests require HARD_BLOCK conflict rules for ER+Solver and CR+Solver, but "Solver" does not exist in `platform_roles` and no HARD_BLOCK rules exist yet.

## Approach
Single SQL migration using a DO block that:

### Setup (test fixtures)
1. Insert `SOLVER` into `platform_roles` temporarily
2. Insert two HARD_BLOCK rules: `ER+SOLVER` and `CR+SOLVER` (applies_scope='SAME_CHALLENGE')
3. Create two test challenges: one ENTERPRISE (`governance_profile='ENTERPRISE'`), one LIGHTWEIGHT (`governance_profile='LIGHTWEIGHT'`), both with `current_phase=3, phase_status='ACTIVE'`
4. Use existing auth user `58fa3afe-...` plus create a second test user reference for reassignment tests

### Test Execution (using RAISE NOTICE for results)

| ID | Test | Method |
|---|---|---|
| T03-01 | HARD_BLOCK: ER+Solver | Assign ER to user, then call `assign_role_to_challenge` with SOLVER. Expect exception. |
| T03-02 | HARD_BLOCK: CR+Solver | Assign CR to user, then call `assign_role_to_challenge` with SOLVER. Expect exception. |
| T03-03 | SOFT_WARN: CR+CU on Enterprise | On ENTERPRISE challenge, assign CR, then call `assign_role_to_challenge` with CU. Expect success + warning message. |
| T03-04 | No warning: CR+CU on Lightweight | On LIGHTWEIGHT challenge, assign CR, then call `assign_role_to_challenge` with CU. Expect success + message=null. |
| T03-05 | ALLOWED: LC+any | Assign CR to user, then assign LC. No conflict rule exists → allowed, no warning. |
| T03-06 | ALLOWED: FC+ID | Assign ID to user, then assign FC. No conflict rule → allowed. |
| T03-07 | Audit trail records | After T03-03's assignment, query `audit_trail` for `ROLE_ASSIGNED` with correct details. |
| T03-08 | reassign_role revokes old | Call `reassign_role` to swap users, verify old user's `is_active=false, revoked_at IS NOT NULL`. |
| T03-09 | reassign_role blocked for completed phase | Set challenge phase_status='COMPLETED' (phase 3, required role=CU), try reassign CU. Expect exception. |
| T03-10 | REGRESSION: T01+T02 pass | Re-run previous test suite functions to confirm they still exist and work. |

Each test wrapped in BEGIN/EXCEPTION block, outputting PASS/FAIL via RAISE NOTICE.

### Cleanup
Delete all test fixtures (user_challenge_roles, audit_trail entries, challenges, conflict rules, platform_role) created during the test.

## Deliverable
Single migration file. No existing code modified.

