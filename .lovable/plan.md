

## Plan: Fix Spec Review Not Advancing Phase — IMPLEMENTED ✅

### Root Cause
`handleConfirmSubmit` and `handleApproveAndContinue` in `AISpecReviewPage.tsx` saved spec edits but never called `complete_phase`, leaving challenges stuck at `current_phase = 1`.

### Fix Applied
- Added `supabase.rpc('complete_phase', ...)` call after saving spec fields in both handlers
- Added `queryClient` invalidation for dashboard queries after phase advancement
- Error handling: if phase advancement fails, user sees toast and navigation is blocked

### Files Modified
- `src/pages/cogniblend/AISpecReviewPage.tsx`
