

# Fix: Assign CU Roles to Existing Challenges + Verify Pipeline

## Current State

The Curation Queue page queries ALL org challenges in phases 1-3 regardless of CU assignment — so challenges **are visible** in the queue. However, they show as "Unassigned" because no CU rows exist in `user_challenge_roles` or `challenge_role_assignments`.

The `initialize_challenge` fix we deployed only applies to **new** challenges. The 3 existing challenges were created before the fix and have only CR assigned.

## What Needs to Happen

### Step 1: Data Fix — Assign CU to existing QUICK-mode challenges

For QUICK governance, the Creator IS the Curator. We need to insert CU (and other missing roles) for the Creator on these 3 challenges.

For the two Phase 3 challenges (`170e577a...` and `0f5d6315...`), also insert into `challenge_role_assignments` so the auto-assign RPC records are consistent.

```sql
-- Insert missing QUICK-mode roles (CU, ER, LC, FC) for the Creator
INSERT INTO user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned)
SELECT '376d7eb8-ce4f-48bd-ac35-4a666756af69', c.id, r.code, true, true
FROM challenges c
CROSS JOIN (VALUES ('CU'), ('ER'), ('LC'), ('FC')) AS r(code)
WHERE c.id IN ('170e577a-...', '0f5d6315-...', '256477ec-...')
  AND c.governance_mode_override = 'QUICK'
ON CONFLICT DO NOTHING;
```

### Step 2: Verify the Curator Queue visibility

After the data fix, log in as `nh-cu@testsetup.dev` (Casey) and check:
- The Curation Queue shows all 3 challenges
- For QUICK-mode challenges created by the Creator, they show as "Assigned to Me" when viewed by the Creator (who holds CU)
- Casey sees them as "Unassigned" (correct — QUICK mode means Creator self-curates)

### Step 3: End-to-end test — Create a NEW challenge

Create a new challenge as the Creator to verify the `initialize_challenge` fix:
- QUICK mode → Creator gets all 5 roles immediately
- Non-QUICK mode → Creator gets CR, then `autoAssignChallengeRole` assigns Casey as CU

## Files Modified

| File | Change |
|------|--------|
| DB Migration | Insert missing CU/ER/LC/FC roles for existing QUICK-mode challenges |

No code changes needed — the client-side fixes from the previous implementation handle new challenges correctly.

