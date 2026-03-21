

## Plan: Fix Spec Review Not Advancing Phase

### Root Cause

Both `handleConfirmSubmit` (line 1071) and `handleApproveAndContinue` (line 1114) in `AISpecReviewPage.tsx` save edited fields to the database and navigate away — but **never call `complete_phase`**. The challenge stays at `current_phase = 1`, so:

1. **WhatsNextCard** keeps showing "Complete Spec Review" (it maps phase 1 → that action)
2. **LC Queue** filters `current_phase >= 2`, so the challenge never appears for Legal Coordinators

### Fix

**File: `src/pages/cogniblend/AISpecReviewPage.tsx`**

- Import and use the `complete_phase` RPC in both `handleConfirmSubmit` and `handleApproveAndContinue`
- After saving spec fields, call `supabase.rpc('complete_phase', { p_challenge_id, p_user_id })` to advance Phase 1 → Phase 2
- Only navigate on successful phase advancement; show error toast on failure
- This triggers the recursive engine — if the same user also holds LC role, it may auto-advance further

**File: `src/components/cogniblend/dashboard/WhatsNextCard.tsx`**

- No changes needed — once `current_phase` advances to 2+, the card will automatically show the correct next action or disappear

### What This Fixes
- Spec approval advances the challenge to Phase 2
- "Complete Spec Review" disappears from the dashboard after approval
- LC Queue correctly shows the challenge only after spec is approved
- The recursive lifecycle engine can auto-complete subsequent phases if the user holds multiple roles

### Files Modified
- `src/pages/cogniblend/AISpecReviewPage.tsx`

