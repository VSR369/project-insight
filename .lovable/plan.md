
# Fix: Registration Page Context Crash

## Problem Statement

The "Continue" button from Dashboard navigates to `/enroll/registration`, which crashes with:
```
useEnrollmentContext must be used within an EnrollmentProvider
```

This happens because `RegistrationContent` (line 62 in `Registration.tsx`) calls `useEnrollmentContext()` directly - which **throws an error** when context is temporarily `undefined` during ErrorBoundary recovery cycles.

## Root Cause Analysis

```text
App.tsx Route Structure:

/enroll/registration  ← NO EnrollmentRequiredGuard
  └─ AuthGuard
     └─ EnrollRegistration
        └─ FeatureErrorBoundary
           └─ RegistrationContent  ← Calls useEnrollmentContext() ❌ THROWS

/enroll/participation-mode  ← HAS EnrollmentRequiredGuard ✅
  └─ AuthGuard
     └─ EnrollmentRequiredGuard  ← Now uses useOptionalEnrollmentContext()
        └─ EnrollParticipationMode
```

**Key Finding:** The `/enroll/registration` route is intentionally NOT wrapped in `EnrollmentRequiredGuard` because registration is where users START (before they have an enrollment). However, `RegistrationContent` still uses the throwing version of the hook.

## Solution

**Simple Fix:** Replace `useEnrollmentContext()` with `useOptionalEnrollmentContext()` in `Registration.tsx` and provide safe fallbacks.

### Changes to `src/pages/enroll/Registration.tsx`

**Line 10 - Change Import:**
```typescript
// FROM:
import { useEnrollmentContext } from '@/contexts/EnrollmentContext';

// TO:
import { useOptionalEnrollmentContext } from '@/contexts/EnrollmentContext';
```

**Line 62 - Use Optional Hook with Safe Defaults:**
```typescript
// FROM:
const { activeEnrollment, activeEnrollmentId } = useEnrollmentContext();

// TO:
const enrollmentContext = useOptionalEnrollmentContext();
const activeEnrollment = enrollmentContext?.activeEnrollment ?? null;
const activeEnrollmentId = enrollmentContext?.activeEnrollmentId ?? null;
```

## Why This is Safe for Registration

The Registration page already handles the case when `activeEnrollmentId` is `null`:

1. **Line 79-83:** Lock logic uses `hasEnrollment = !!activeEnrollmentId` - already handles null
2. **Line 157-162:** Falls back to `provider.industry_segment_id` if no active enrollment
3. **Line 239-252:** The `activeEnrollment && (...)` pattern already guards against null

No other logic changes needed - the page is already written to work without an active enrollment.

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/enroll/Registration.tsx` | Use `useOptionalEnrollmentContext()` with safe defaults |

## Impact Assessment

| Risk | Level | Mitigation |
|------|-------|------------|
| Breaking registration flow | None | Page already handles null enrollment |
| Changing UX | None | Same behavior, just no crash |
| Affecting other enrollment pages | None | Only Registration.tsx is changed |

## End-to-End Flow After Fix

| Action | Result |
|--------|--------|
| Click "Continue Setup" on Dashboard | Navigates to `/enroll/registration` ✅ |
| Registration page loads | Uses optional context, no crash ✅ |
| Fill form, click Continue | Navigates to `/enroll/participation-mode` ✅ |
| All subsequent steps | Protected by `EnrollmentRequiredGuard` ✅ |
