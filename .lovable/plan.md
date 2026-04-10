

## Fix: Assignment/Reassignment Flow — 5 Confirmed Bugs

### Summary of Findings

| # | Bug | Status | Root Cause |
|---|-----|--------|------------|
| 1 | `draftForm` null on first render | ALREADY FIXED | `form` passed directly (line 96-100) |
| 2 | `useSaveDraft.onSuccess` missing invalidation | ALREADY FIXED | Invalidation present (line 317) |
| 3 | `assign_challenge_role` RECORD vs JSONB mismatch | **OPEN — CRITICAL** | `v_validation.allowed` always NULL → every CU assignment silently rejected |
| 4 | `sendRoutedNotification` never called from submit flow | **OPEN** | Infrastructure exists but is unused; hardcoded notification on lines 212-231 only fires if assignment succeeds (which it can't due to Bug 3) |
| 5 | `complete_phase` sla_hours vs sla_days | ALREADY FIXED | Latest migration uses `sla_days` correctly |
| 6 | `notification_routing` phase numbers | ALREADY CORRECT | Phase 2 = ROLE_ASSIGNED for CU, aligned with 10-phase model |
| 7 | `reassign_role` calls `assign_role_to_challenge` (no SLM tracking) | **OPEN** | `assign_role_to_challenge` only writes `user_challenge_roles`, never touches `challenge_role_assignments` — so pool workload counters are never updated on reassignment |
| 8 | CurationQueue filters by `organization_id` (cross-org assignment invisible) | **OPEN — DESIGN LIMIT** | Pool members from different orgs won't see challenges. RLS also scopes by `tenant_id`. For now, all curators are in the same org — this is a future concern, not a current blocker. |

### Bugs to Fix (3 confirmed open, 1 data backfill)

---

### Bug 3 — `assign_challenge_role`: RECORD vs JSONB type mismatch (THE ROOT CAUSE)

**This is the single most critical bug.** Every CU assignment via `assign_challenge_role` silently fails because:

```sql
v_validation RECORD;
SELECT * INTO v_validation FROM validate_role_assignment(...);
-- validate_role_assignment returns JSONB, not a table row
-- So v_validation has one unnamed column containing the JSONB blob
-- v_validation.allowed → NULL (no such named field)
-- NULL IS NOT TRUE → TRUE → returns {success: false} immediately
```

Meanwhile, `assign_role_to_challenge` (used by `reassign_role`) correctly does:
```sql
v_validation jsonb;
v_validation := validate_role_assignment(...);
IF (v_validation->>'allowed')::boolean = false THEN ...
```

**Fix (SQL migration):** Rewrite `assign_challenge_role` to declare `v_validation JSONB` and use `(v_validation->>'allowed')::boolean` instead of `v_validation.allowed`.

```sql
-- Change declaration
v_validation JSONB;

-- Change assignment
v_validation := public.validate_role_assignment(
    p_user_id, p_challenge_id, p_governance_role_code, v_gov_mode
);

-- Change check
IF (v_validation->>'allowed')::boolean IS NOT TRUE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', COALESCE(v_validation->>'message', 'Role assignment blocked'),
      'conflict_type', v_validation->>'conflict_type'
    );
END IF;
```

---

### Bug 4 — `sendRoutedNotification` never integrated into submit flow

The current code on lines 212-231 of `useChallengeSubmit.ts` does a manual `cogni_notifications` insert. This works but bypasses the routing infrastructure (no CC roles, no escalation). Replace with `sendRoutedNotification`.

**File:** `src/hooks/cogniblend/useChallengeSubmit.ts` (lines 204-237)

After `autoAssignChallengeRole` succeeds, call:
```typescript
import { sendRoutedNotification } from '@/services/notificationRoutingService';

// After autoAssignChallengeRole completes (success or failure):
await sendRoutedNotification({
  challengeId, phase: 2,
  eventType: 'ROLE_ASSIGNED',
  title: 'New Challenge for Curation',
  message: `Challenge "${payload.title ?? 'Untitled'}" has been assigned for curation review.`,
});
```

This uses the routing table (phase 2, ROLE_ASSIGNED → primary: CR, cc: CU) to notify both the creator and the assigned curator. Keep the existing manual insert as a fallback if `sendRoutedNotification` returns 0 (no routing config found).

Also add a Phase 1 completion notification:
```typescript
await sendRoutedNotification({
  challengeId, phase: 1,
  eventType: 'PHASE_COMPLETE',
  title: 'Challenge Submitted',
  message: `Challenge "${payload.title}" has been submitted for curation.`,
});
```

---

### Bug 7 — `reassign_role` calls `assign_role_to_challenge` (no SLM/pool tracking)

`reassign_role` uses `assign_role_to_challenge` which only writes `user_challenge_roles`. It never updates `challenge_role_assignments` (the SLM-level tracking table) and never increments/decrements `platform_provider_pool.current_assignments`.

**Fix (SQL migration):** Update `reassign_role` to:
1. Deactivate the old `challenge_role_assignments` row (if any) and decrement old pool member's `current_assignments`
2. Call `assign_challenge_role` (which handles both `user_challenge_roles` AND `challenge_role_assignments` + workload counters) instead of `assign_role_to_challenge`
3. Since `assign_challenge_role` requires `p_slm_role_code` and `p_pool_member_id`, look up the existing SLM code from `challenge_role_assignments` for the old assignment, and pass NULL for pool_member_id on reassignment (org-direct assignment)

```sql
CREATE OR REPLACE FUNCTION public.reassign_role(
  p_challenge_id uuid, p_role_code text,
  p_old_user_id uuid, p_new_user_id uuid,
  p_reassigned_by uuid, p_reason text
) RETURNS jsonb ...
AS $$
DECLARE
  v_current_phase integer; v_phase_status text; v_required_role text;
  v_old_slm_code text; v_old_pool_member_id uuid;
  v_assign_result jsonb;
BEGIN
  -- Phase checks (existing)...
  
  -- Revoke old user's governance role
  UPDATE user_challenge_roles SET is_active = false, revoked_at = now()
  WHERE user_id = p_old_user_id AND challenge_id = p_challenge_id AND role_code = p_role_code;

  -- Find old SLM assignment for context
  SELECT role_code, pool_member_id INTO v_old_slm_code, v_old_pool_member_id
  FROM challenge_role_assignments
  WHERE challenge_id = p_challenge_id AND role_code LIKE '%' AND status = 'active'
  -- match by governance role via the audit or convention
  LIMIT 1;

  -- Deactivate old SLM assignment + decrement workload
  UPDATE challenge_role_assignments SET status = 'released', updated_at = now()
  WHERE challenge_id = p_challenge_id AND pool_member_id = v_old_pool_member_id AND status = 'active';
  
  IF v_old_pool_member_id IS NOT NULL THEN
    UPDATE platform_provider_pool
    SET current_assignments = GREATEST(current_assignments - 1, 0)
    WHERE id = v_old_pool_member_id;
  END IF;

  -- Assign new user via assign_challenge_role (handles both tables + workload)
  v_assign_result := assign_challenge_role(
    p_challenge_id, NULL, p_new_user_id,
    COALESCE(v_old_slm_code, 'R5_MP'), p_role_code,
    p_reassigned_by, NULL
  );

  -- SLA reset, notifications, audit (existing)...
END;
$$;
```

---

### Data Backfill — Assign CU to orphaned Phase 2 challenges

After Bug 3 is fixed, run a one-time backfill to assign curators to the 5 Phase 2 challenges that have no CU assignment. This will use the Supabase insert tool to call `assign_challenge_role` RPC for each.

---

### Files Changed

| File | Change |
|------|--------|
| SQL migration (new) | Fix `assign_challenge_role` RECORD→JSONB type mismatch |
| SQL migration (new) | Fix `reassign_role` to use `assign_challenge_role` instead of `assign_role_to_challenge` |
| `src/hooks/cogniblend/useChallengeSubmit.ts` | Replace manual notification insert with `sendRoutedNotification` calls |
| Data operation | Backfill CU assignments for orphaned Phase 2 challenges |

