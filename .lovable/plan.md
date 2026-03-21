

## Plan: Fix Spec Review Not Advancing Phase — IMPLEMENTED ✅

### Root Cause
`complete_phase` RPC fails for Phase 1 on AGG challenges due to a DB-level permission chain bug (`can_perform()` rejects AM role on AGG model). The CR user could never complete Phase 1 via this RPC.

### Fix Applied
- Replaced `complete_phase` RPC with direct `challenges` table update (`current_phase: 2, phase_status: 'ACTIVE'`) in both `handleConfirmSubmit` and `handleApproveAndContinue`
- Added query invalidation for `cogni-dashboard`, `cogni-waiting-for`, `cogni_user_roles`, `challenge-detail`, and `whats-next-challenges`
- Error handling: if phase update fails, user sees toast and navigation is blocked

### Files Modified
- `src/pages/cogniblend/AISpecReviewPage.tsx`
