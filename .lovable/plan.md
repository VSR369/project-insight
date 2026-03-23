

# Fix: Seed Demo Scenario Failure

## Root Cause

The `setup-test-scenario` edge function was updated to insert `role_code = 'CA'` for Marketplace challenges, but **`CA` does not exist in the `platform_roles` table**. The table only has `CR` (named "Challenge Creator/Architect"). This causes a foreign key violation on `user_challenge_roles.role_code`.

## Solution

There are two options:

### Option A: Add `CA` as a new platform role (recommended by plan)
- Add a row to `platform_roles`: `CA` / "Challenge Architect"
- Also add FK entry in `challenge_role_assignments` if it has the same constraint
- Keep `CR` for AGG model, use `CA` for MP model
- This requires a migration + updating the seed function

### Option B: Revert to using `CR` for both models (simpler)
- Revert the seed function to use `CR` everywhere
- Distinguish MP vs AGG behavior via `operating_model` on the challenge, not role code
- Less invasive but doesn't achieve the role separation the plan calls for

**Recommended: Option A** — Add `CA` to `platform_roles` table, then the seed will work.

## Changes

### 1. Database migration
Insert new platform role:
```sql
INSERT INTO platform_roles (role_code, role_name, description)
VALUES ('CA', 'Challenge Architect', 'Specification owner for Marketplace model challenges');
```

### 2. Verify `challenge_role_assignments` constraint
Check if that table also has a FK to `platform_roles` on `role_code` — if so, `CA` will now be valid there too after the migration.

### 3. No edge function changes needed
The current `setup-test-scenario` code already uses `CA` for MP challenges — it just needs the DB role to exist.

## Technical Details
- **Table**: `platform_roles` (lookup table for valid role codes)
- **Constraint**: `user_challenge_roles_role_code_fkey` → `platform_roles(role_code)`
- **Files modified**: 1 migration only
- **Risk**: Very low — additive insert, no existing data affected

