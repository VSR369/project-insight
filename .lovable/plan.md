

# Fix: Legacy `CA` Role Blocking "My Challenges" Visibility

## Root Cause

The user has `role_code = 'CA'` (legacy Challenge Architect) in `user_challenge_roles`. The previous migration deactivated `AM`, `ID`, `RQ` but missed `CA`. The sidebar permission check `canSeeChallengePage` requires `'CR'`, so the menu item is hidden. The default CR fallback doesn't help because `allRoleCodes` is non-empty (contains `CA`).

## Fix (2 changes)

### 1. SQL Migration — Convert legacy `CA` roles to `CR`

Update all active `CA` role assignments to `CR` in `user_challenge_roles`. Also deactivate any resulting duplicates (where user already has `CR` for the same challenge).

```sql
-- Convert CA → CR (where no CR already exists for same user+challenge)
UPDATE public.user_challenge_roles
SET role_code = 'CR'
WHERE role_code = 'CA' AND is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM public.user_challenge_roles ucr2
    WHERE ucr2.user_id = user_challenge_roles.user_id
      AND ucr2.challenge_id = user_challenge_roles.challenge_id
      AND ucr2.role_code = 'CR' AND ucr2.is_active = true
  );

-- Deactivate remaining CA rows (duplicates)
UPDATE public.user_challenge_roles
SET is_active = false
WHERE role_code = 'CA' AND is_active = true;
```

### 2. Frontend safety net — `useCogniPermissions.ts`

Add `CA` as a legacy alias alongside `CR` in the `sees` and `can` checks, so any unconverted data still works:

- `canSeeChallengePage: sees(['CR', 'CA'])`
- `canSeeCreatorDashboard: sees(['CR', 'CA'])`
- `canCreateChallenge: can(['CR', 'CA'])`
- `canEditSpec: can(['CR', 'CA'])`
- `isSpecRole: can(['CR', 'CA'])`

Also update `SEEKING_ORG_ROLES` set to include `'CA'`.

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Convert `CA` → `CR`, deactivate leftover `CA` |
| `src/hooks/cogniblend/useCogniPermissions.ts` | Add `CA` as legacy alias in all CR permission checks |

