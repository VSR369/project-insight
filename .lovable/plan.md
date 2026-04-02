

# Fix: Governance Mode Not Correctly Applied to Challenges

## Problem Summary

Your organization ("New Horizon Company") is configured as **CONTROLLED** governance with a **premium** tier. However, all 3 existing challenges were created with `governance_mode_override: QUICK`, which caused the system to assign all 5 roles (CR, CU, ER, LC, FC) to a single user — violating CONTROLLED mode's role separation rules.

There are **two bugs** causing this:

### Bug 1: Wrong initial governance default (race condition)
In `ChallengeCreatePage.tsx` line 150, the governance mode state initializes as `'QUICK'`:
```ts
const [governanceMode, setGovernanceMode] = useState<GovernanceMode>('QUICK');
```
A `useEffect` later corrects it to CONTROLLED once the org data loads, but the initial value is wrong. If a challenge is created before the effect fires (or if the form was submitted quickly), the challenge gets `QUICK` as its override.

### Bug 2: Previous data fix was governance-blind
The migration we ran earlier blindly inserted CU, ER, LC, FC roles for the Creator on all 3 challenges — without checking whether those challenges actually needed multi-role assignment. For CONTROLLED mode, only CR should be assigned to the Creator; other roles must go to different users.

## Root Cause in DB

All 3 challenges have:
- `governance_mode_override: QUICK` (wrong — should be CONTROLLED or null)
- `governance_profile: CONTROLLED` (correct — from org)
- All 5 roles assigned to user `376d7eb8...` (wrong for CONTROLLED)

## Plan

### Step 1: Fix initial governance state
**File: `src/pages/cogniblend/ChallengeCreatePage.tsx`**
- Change `useState<GovernanceMode>('QUICK')` to compute the correct default eagerly, or use a sentinel value that prevents form interaction until the org loads
- Simplest fix: initialize as `'STRUCTURED'` (safe middle-ground) and let the effect correct it, OR derive from `currentOrg` synchronously

### Step 2: Data fix — correct existing challenges
**Database migration:**
- Update the 3 existing challenges: set `governance_mode_override` to match the org's `governance_profile` (`CONTROLLED`)
- Remove the incorrectly assigned CU, ER, LC, FC roles from the Creator (user `376d7eb8...`) — in CONTROLLED mode, the Creator should only hold CR
- These roles should later be assigned to separate users via auto-assignment or manual assignment

```sql
-- Fix governance override
UPDATE challenges
SET governance_mode_override = 'CONTROLLED'
WHERE id IN ('170e577a-...', '0f5d6315-...', '256477ec-...')
  AND governance_mode_override = 'QUICK';

-- Remove non-CR roles from Creator (CONTROLLED = role separation)
DELETE FROM user_challenge_roles
WHERE user_id = '376d7eb8-...'
  AND challenge_id IN ('170e577a-...', '0f5d6315-...', '256477ec-...')
  AND role_code IN ('CU', 'ER', 'LC', 'FC');
```

### Step 3: Trigger auto-assignment for CU role
After removing the incorrectly merged roles, the challenges need proper CU assignment from the provider pool (Casey / `nh-cu@testsetup.dev`). This will happen automatically when the Creator submits or can be triggered manually.

## Files Modified

| File | Change |
|------|--------|
| `src/pages/cogniblend/ChallengeCreatePage.tsx` | Fix initial `useState` default to avoid QUICK race condition |
| DB Migration | Correct `governance_mode_override` and remove invalid role assignments for existing challenges |

## Impact
- Existing CONTROLLED challenges will correctly show only the CR role for the Creator
- CU, ER, LC, FC will need to be assigned to separate users (enforced by role separation rules)
- New challenges will initialize with the correct governance mode from the org profile

