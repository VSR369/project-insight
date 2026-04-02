

# Fix: Creator → Curator Assignment Pipeline

## Root Cause Analysis

### Root Cause 1: Governance override set AFTER role assignment
The `initialize_challenge` RPC calls `auto_assign_roles_on_creation` internally. At that point, `governance_mode_override` has NOT been set yet (it's set later by `useSubmitSolutionRequest` in the `.update()` call). So `resolve_challenge_governance` inside `auto_assign_roles_on_creation` reads the org's default profile (CONTROLLED) → assigns only CR, even when the Creator selected QUICK.

**Timeline:**
```text
initialize_challenge()          ← governance_mode_override is NULL
  └── auto_assign_roles_on_creation()
        └── resolve_challenge_governance() → reads CONTROLLED → assigns CR only
.update({ governance_mode_override: 'QUICK' })   ← too late
complete_phase()                ← advances phase, but no CU assigned
```

### Root Cause 2: No CU pool assignment in `useSubmitSolutionRequest`
After `complete_phase` succeeds, `useSubmitSolutionRequest` does NOT call `autoAssignChallengeRole` for CU. The auto-assignment code only exists in `AISpecReviewPage.tsx`, which is a separate page the Creator visits for spec review — not part of the main submission flow.

### Root Cause 3: For QUICK mode, Creator needs all 5 roles
QUICK governance means the Creator wears all hats (CR, CU, ER, LC, FC). But because of Root Cause 1, only CR gets assigned. `complete_phase` then tries to advance phases but `can_perform(user, challenge, 'CU')` fails at phase 3 because CU was never assigned.

---

## Implementation Plan

### Step 1: DB Migration — Fix `initialize_challenge` to accept governance override

Alter `initialize_challenge` to accept an optional `p_governance_mode_override TEXT DEFAULT NULL` parameter. Set `governance_mode_override` on the challenge row BEFORE calling `auto_assign_roles_on_creation`. This ensures QUICK mode gets all 5 roles assigned to the Creator at creation time.

```sql
-- Add parameter p_governance_mode_override TEXT DEFAULT NULL
-- Before INSERT, if override provided, set it on the row
-- This ensures auto_assign_roles_on_creation sees the correct mode
```

### Step 2: DB Migration — Fix `can_perform` legacy AM/RQ check

`can_perform` still has stale logic:
```sql
IF p_required_role = 'AM' AND v_operating_model = 'AGG' THEN RETURN false;
IF p_required_role = 'RQ' AND v_operating_model = 'MP' THEN RETURN false;
```
These reference removed codes (AM, RQ). While `roles_equivalent` handles the mapping, the operating model checks block valid users. Remove these two checks since `get_phase_required_role` already uses modern codes.

### Step 3: Client — Pass governance override to `initialize_challenge`

Update `useSubmitSolutionRequest` to pass `p_governance_mode_override` when calling `initialize_challenge` RPC. This is a one-line addition to the RPC call.

### Step 4: Client — Add CU auto-assignment after `complete_phase`

In `useSubmitSolutionRequest`, after `complete_phase` succeeds, add CU pool auto-assignment for STRUCTURED/CONTROLLED modes (where CU is a different person from the pool). For QUICK mode, this is unnecessary since the Creator already has the CU role.

```typescript
// After complete_phase succeeds:
if (effectiveGovernance !== 'QUICK') {
  try {
    await autoAssignChallengeRole({
      challengeId,
      roleCode: 'CU',
      engagementModel: payload.operatingModel === 'AGG' ? 'aggregator' : 'marketplace',
      industrySegmentId: payload.industrySegmentId || undefined,
      assignedBy: payload.creatorId,
    });
  } catch (err) {
    logWarning('Auto-assign CU after submit failed', { ... });
  }
}
```

### Step 5: Verify Casey's pool entry

Already confirmed: Casey (user_id: `5c67ff44...`) has `role_codes: ['R5_MP', 'R5_AGG']`, `domain_scope: {}` (wildcard), `is_active: true`, `availability_status: 'available'`. No changes needed.

---

## Files Modified

| File | Change |
|------|--------|
| DB Migration | Alter `initialize_challenge` to accept `p_governance_mode_override`, set it before `auto_assign_roles_on_creation` |
| DB Migration | Clean `can_perform` — remove stale AM/RQ operating model checks |
| `src/hooks/cogniblend/useSubmitSolutionRequest.ts` | Pass governance override to `initialize_challenge`; add CU auto-assignment after `complete_phase` for non-QUICK modes |

## Expected Result

1. **QUICK mode**: Creator creates challenge → `initialize_challenge` sets override → `auto_assign_roles_on_creation` sees QUICK → assigns all 5 roles to Creator → `complete_phase` auto-advances through CR/CU phases → Creator sees all workspaces
2. **STRUCTURED/CONTROLLED mode**: Creator creates challenge → only CR assigned → `complete_phase` advances to phase 2 → `autoAssignChallengeRole` finds Casey in pool → RPC creates CU role for Casey → Casey sees challenge in Curation Queue

