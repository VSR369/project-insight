

# Fix: Stale Data Showing on New Challenge Creation

## Root Cause

**Race condition between hooks.** The execution order on mount is:

1. `useFormPersistence` (line 475) runs its `useEffect` and **restores** stale data from sessionStorage into the form via `form.reset()`
2. The clearing `useEffect` (line 480) runs and removes the sessionStorage key -- but the form already has the stale data loaded into it

Clearing sessionStorage after restoration is too late. The form state is already polluted.

## Fix

**Clear sessionStorage synchronously BEFORE `useFormPersistence` runs**, not in a `useEffect`. Move the clearing logic above the hook call so it executes during render (before any effects fire).

### File 1: `src/pages/cogniblend/ConversationalIntakePage.tsx`

- Remove the `useEffect` at lines 480-484
- Add synchronous clearing **before** the `useFormPersistence` call (before line 475):

```typescript
// Clear stale data synchronously before persistence hook restores
if (mode === 'create' && !editChallengeId) {
  sessionStorage.removeItem('cogni_intake_conversational');
}

const { clearPersistedData } = useFormPersistence('cogni_intake_conversational', form);
```

However, running side effects during render is not ideal. A cleaner approach: add a `skipRestore` option to `useFormPersistence`.

**Better approach** -- pass a flag to skip restoration:

```typescript
const { clearPersistedData } = useFormPersistence('cogni_intake_conversational', form, {
  skipRestore: mode === 'create' && !editChallengeId,
});
```

### File 2: `src/hooks/useFormPersistence.ts`

- Add an optional `options` parameter with `skipRestore?: boolean`
- In the restore `useEffect`, check `if (options?.skipRestore)` and clear storage + return early
- This also clears the key so the watcher doesn't re-save default values from a previous session

### File 3: `src/components/cogniblend/SimpleIntakeForm.tsx`

- Same fix: remove the `useEffect` clearing logic and pass `skipRestore: mode === 'create'` to `useFormPersistence`

## Technical Details

The `useFormPersistence` hook change:

```typescript
interface FormPersistenceOptions {
  skipRestore?: boolean;
}

export function useFormPersistence<T extends FieldValues>(
  storageKey: string,
  form: UseFormReturn<T>,
  options?: FormPersistenceOptions,
) {
  // In restore useEffect:
  if (options?.skipRestore) {
    sessionStorage.removeItem(storageKey);
    return;
  }
  // ... existing restore logic
}
```

**Files modified**: 3 (`useFormPersistence.ts`, `ConversationalIntakePage.tsx`, `SimpleIntakeForm.tsx`)

