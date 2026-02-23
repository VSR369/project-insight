

# Fix "Save & Continue" on Primary Contact Form

## Root Cause Analysis

Two issues are preventing "Save & Continue" from working:

1. **Silent early return**: If `state.organizationId` or `state.tenantId` is missing from the registration context (e.g., user navigated directly to Step 2, or the context was lost), the form submit handler silently returns on line 175 with zero user feedback.

2. **Missing try/catch**: The `await upsertContact.mutateAsync(...)` call is not wrapped in a `try...catch`. If the database operation fails (RLS policy, constraint violation, network error), the promise rejection goes unhandled and the form just freezes with no feedback.

## Changes (1 file)

### `src/components/registration/PrimaryContactForm.tsx`

**Fix 1 — Add user feedback for missing context:**
Replace the silent `return` when `organizationId`/`tenantId` are missing with a toast error message so the user knows something went wrong:
```
if (!state.organizationId || !state.tenantId) {
  toast.error("Registration session not found. Please start from Step 1.");
  return;
}
```

**Fix 2 — Wrap mutateAsync in try/catch:**
Wrap the `await upsertContact.mutateAsync(...)` and subsequent navigation calls in a `try...catch` block so database errors are caught and displayed to the user instead of silently crashing:
```
try {
  await upsertContact.mutateAsync({ ... });
  setStep2Data({ ... });
  setStep(3);
  navigate('/registration/compliance');
} catch (error) {
  // Error toast is already handled by the mutation's onError callback
  // This catch prevents unhandled promise rejection / white screen
}
```

## What stays the same
- All OTP bypass changes remain
- Form validation, schema, and field structure unchanged
- The mutation hook's built-in `onError` toast continues to work for DB errors

## Expected Result
- If context is missing: user sees "Registration session not found" toast
- If DB error occurs: user sees the error toast from the mutation hook, form stays on screen and can be retried
- If everything works: form saves and navigates to Step 3 as expected
