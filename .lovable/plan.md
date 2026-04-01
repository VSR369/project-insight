

# Fix: "You do not have permission for this phase" — Phase 1 Permission Failure

## Root Cause (5 Whys)

1. **Why** does "complete_phase" fail? → `can_perform` returns false for phase 1.
2. **Why** does `can_perform` return false? → It checks if the user holds role `'AM'` (Account Manager).
3. **Why** does it check for `'AM'`? → `get_phase_required_role(1)` returns `'AM'`.
4. **Why** doesn't `roles_equivalent` match `'AM'` to `'CR'`? → It only maps CR↔CA, not AM→CR.
5. **Why** is `'AM'` still in the system? → Legacy role codes were not fully migrated in the database functions. The memory confirms AM, RQ, CA, and ID are all deprecated and should resolve to CR or CU.

## Fix: Single Database Migration

Update two functions:

### 1. `get_phase_required_role` — Replace all legacy codes

| Phase | Current (broken) | Fixed |
|-------|-----------------|-------|
| 1 | `AM` | `CR` |
| 2 | `CR` | `CR` (no change) |
| 3 | `CU` | `CU` (no change) |
| 4 | `ID` | `CU` |
| 5 | `ID` | `CU` |
| 6 | `ID` | `CU` |
| 11 | `ID` | `CU` |
| 13 | `ID` | `CU` |

### 2. `roles_equivalent` — Add legacy mappings

Add: AM→CR, RQ→CR, ID→CU equivalences so any remaining legacy data in `user_challenge_roles` still works.

## Changes

| Layer | What |
|-------|------|
| Database migration | `CREATE OR REPLACE FUNCTION get_phase_required_role` + `CREATE OR REPLACE FUNCTION roles_equivalent` |

No frontend changes needed — the client code is correct, only the DB functions use stale legacy role codes.

