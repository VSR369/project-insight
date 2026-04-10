

## Fix: Save Draft Silent Failure — Missing User Feedback on Early Returns

### Root Cause

The `handleSaveDraft` function in `useCreatorDraftSave.ts` has **silent early returns** at lines 42-44:

```typescript
if (!form) return;              // no toast, no message
if (!orgId || !userId) return;  // no toast, no message
```

When any of these conditions is true, the Save Draft button click does absolutely nothing — no loading spinner, no success toast, no error toast. The user sees no feedback whatsoever.

This happens when:
- `draftForm` is still `null` (set via `useEffect` with a render delay)
- `currentOrg?.organizationId` is undefined (org data still loading)
- `user?.id` is undefined (auth state not yet resolved)

Additionally, the `catch` block at line 77 is empty (`catch { /* handled by mutation onError */ }`), which is correct since the mutation's `onError` handles it — but the early returns bypass the mutation entirely.

### Fix

**One file change: `src/hooks/cogniblend/useCreatorDraftSave.ts`**

Replace the silent early returns with user-facing toast warnings:

```typescript
const handleSaveDraft = useCallback(async () => {
  if (!form) {
    toast.error('Form is not ready yet. Please wait a moment and try again.');
    return;
  }
  const data = form.getValues();
  if (!orgId || !userId) {
    toast.error('Organization or user context not loaded. Please wait and try again.');
    return;
  }
  // ... rest of the function unchanged
```

This is not a workaround — it is the correct fix. The early returns are legitimate guard clauses, but they must inform the user instead of silently swallowing the click.

### No other changes needed

- The DB functions (`initialize_challenge`, `complete_phase`) are already fixed and verified
- The mutation `onSuccess` and `onError` handlers already show toasts correctly
- Only these silent guard clauses lack feedback

### Summary

| File | Change |
|------|--------|
| `src/hooks/cogniblend/useCreatorDraftSave.ts` | Add toast.error() to both early return paths (lines 42, 44) |

