

# Fix: Add Role Verification to Compliance RPCs

## Gap Found
The document (page 5-6) specifies that `complete_legal_review` must verify the caller has the **LC role** and `complete_financial_review` must verify the **FC role** on the challenge before proceeding. The current migration skips this check entirely.

**Risk:** Any authenticated user could call `complete_legal_review` on a challenge they have no role on, setting `lc_compliance_complete = TRUE` without authorization.

## Fix

### Single migration — Add role guards to both RPCs

**File:** New migration SQL

Replace both functions with versions that add the role verification block before setting the compliance flag:

For `complete_legal_review`:
- After fetching the challenge, check `SELECT EXISTS(SELECT 1 FROM user_challenge_roles WHERE user_id = p_user_id AND challenge_id = p_challenge_id AND role_code = 'LC' AND is_active = true)`
- If not found, return `{ success: false, error: 'User does not have LC role on this challenge' }`

For `complete_financial_review`:
- Same pattern but checking `role_code = 'FC'`

No frontend changes needed — the RPCs already return error objects that the frontend handles.

## Technical Detail

```text
complete_legal_review flow:
1. Fetch challenge (existing)
2. NEW: Verify user has LC role → fail if not
3. Verify phase = 2 (existing)
4. Set lc_compliance_complete = TRUE (existing)
5. Audit + conditional advance (existing)
```

## Files Changed

| File | Change |
|------|--------|
| New migration SQL | Add LC/FC role verification to both RPCs |

