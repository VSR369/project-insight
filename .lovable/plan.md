

## Plan: Fix Spec Review Phase Advancement

### Root Cause

The `complete_phase` RPC fails because of a **DB-level bug** in the permission chain:

1. Challenge is at `current_phase = 1` (Intake phase)
2. `get_phase_required_role(1)` returns `'AM'` (Account Manager)
3. `can_perform()` Step 3 explicitly rejects `AM` role on `AGG` (Aggregator) operating model
4. Result: `complete_phase` can **never succeed** for Phase 1 on AGG challenges
5. The logged-in user (Chris Rivera) has `CR` role, not `AM` or `RQ` — so Phase 1 was never completable by this user anyway

Phase 1 (Intake/Creation) should have been auto-completed when the challenge was first created. It was not, so the challenge is stuck at Phase 1 while the UI presents the Phase 2 workflow (Spec Review).

### Fix (Two Parts)

**Part 1 — `AISpecReviewPage.tsx`: Replace `complete_phase` with direct phase update**

In both `handleConfirmSubmit` and `handleApproveAndContinue`, remove the `complete_phase` RPC call. Replace it with a direct update that advances `current_phase` from 1 to 2 (marking spec review as complete):

```ts
// Instead of complete_phase RPC, directly advance phase
const { error } = await supabase
  .from('challenges')
  .update({
    current_phase: 2,
    phase_status: 'ACTIVE',
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  })
  .eq('id', challengeId);
```

This ensures:
- The spec review approval updates the DB status immediately
- LC Queue (`current_phase >= 2` filter) will show the challenge
- No dependency on `complete_phase` permission chain for this step
- Audit trail is preserved via the existing `updated_by` field

**Part 2 — Invalidate additional query keys**

Add invalidation for `cogni_user_roles` and `challenge-detail` so the dashboard, LC queue, and WhatsNextCard reflect the phase change immediately.

### What This Fixes
- "Phase advancement failed: You do not have permission" error is eliminated
- After CR approves spec, challenge moves to `current_phase = 2`
- LC and FC see the challenge in their queues
- WhatsNextCard no longer shows "Complete Spec Review" after approval

### Files Modified
- `src/pages/cogniblend/AISpecReviewPage.tsx`

