

## Fix: Save Draft Toast & Race Condition Bugs

### What's wrong

1. **Double toast on save**: `useSaveDraft.onSuccess` shows "Draft saved successfully" and `useUpdateDraft.onSuccess` shows "Draft updated successfully". These are the only toast sources — the caller (`handleSaveDraft`) has no toast of its own. The problem is there's no differentiation for the user, and if the mutation succeeds, the toast fires automatically. This is actually correct single-toast behavior per mutation. However, if future code adds a toast in `handleSaveDraft`, it would double up. The comment on line 82 is misleading.

2. **No early-exit guard in handleSaveDraft**: If `isSaving` is true (rapid double-click), the function still executes because there's no `if (isSaving) return` guard inside the callback itself — the button `disabled` prop helps but isn't bulletproof (race between click event and React re-render).

3. **No "already saved" indicator**: When a draft already exists and nothing changed, the update still fires silently.

### Changes

**File 1: `src/hooks/cogniblend/useChallengeSubmit.ts`**
- Remove `toast.success(...)` from `useSaveDraft.onSuccess` (line 294)
- Remove `toast.success(...)` from `useUpdateDraft.onSuccess` (line 322)
- Keep query invalidation in both `onSuccess` handlers

**File 2: `src/hooks/cogniblend/useCreatorDraftSave.ts`**
- Add `isSaving` guard at top of `handleSaveDraft`: `if (isSaving) return;` — prevents race condition
- Add `toast.success()` after successful save/update with distinct messages:
  - New draft: `toast.success('Draft saved successfully')`
  - Existing draft updated: `toast.success('Draft updated successfully')`
- Keep existing `toast.error()` guards for missing form/org/user

### Why this is the correct fix (not a workaround)

- Toast responsibility belongs in the orchestrator (`handleSaveDraft`) which knows whether it's a create or update — not in the generic mutation hooks which don't have that context
- The `isSaving` guard inside the callback is defense-in-depth against the React render cycle race — the button `disabled` prop is the primary guard but isn't synchronous with click dispatch
- No tech debt: clean separation of concerns between mutation hooks (data + cache) and orchestrator (UX feedback)

