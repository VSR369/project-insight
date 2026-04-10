

## Fix "Permission denied for phase 1 (requires CR)" on Submit

### Root Cause

The `complete_phase` RPC calls `can_perform(p_user_id, p_challenge_id, 'CR')` which checks the `user_challenge_roles` table for an active CR assignment. However, `initialize_challenge` creates the challenge row but **never inserts a CR role** into `user_challenge_roles`. Result: every submit fails with "Permission denied for phase 1 (requires CR)."

This affects all 6 governance × engagement combinations.

### Persistence Check

The 3-layer defense for Alt+Tab data loss is confirmed in place:
- Layer 1 (`useAuth.tsx`): `previousUserIdRef` seeded at line 76 — present
- Layer 2 (`OrgContext.tsx`): `orgLoadedOnce` ref with conditional spinner at line 91 — present
- Layer 3 (`ChallengeCreatePage.tsx`): `useRef` initialization guards — present

### Fix

**Database migration** — Update `initialize_challenge` to insert a CR role into `user_challenge_roles` after creating the challenge:

```sql
CREATE OR REPLACE FUNCTION public.initialize_challenge(
  p_org_id UUID, p_creator_id UUID, p_title TEXT,
  p_operating_model TEXT DEFAULT 'MP',
  p_governance_mode_override TEXT DEFAULT NULL
) RETURNS UUID ...
AS $$
DECLARE
  v_challenge_id UUID;
  -- existing vars...
BEGIN
  -- existing challenge INSERT...

  -- NEW: Assign CR role to creator
  INSERT INTO public.user_challenge_roles (
    user_id, challenge_id, role_code, is_active, assigned_by
  ) VALUES (
    p_creator_id, v_challenge_id, 'CR', true, p_creator_id
  ) ON CONFLICT (user_id, challenge_id, role_code) DO NOTHING;

  RETURN v_challenge_id;
END;
$$;
```

This is the minimal, surgical fix. The CR role assignment is atomic with challenge creation — no race conditions, no client-side workaround needed.

### Summary

| Change | File/Location | What |
|--------|--------------|------|
| DB migration | `initialize_challenge` RPC | Add CR role insert after challenge creation |

No frontend changes needed. The submit flow already correctly passes `creatorId` to `complete_phase`.

