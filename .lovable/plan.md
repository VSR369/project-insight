

## Fix Alt+Tab Data Loss & Submit Race Condition

### Bug 1 — Form Data Lost on Alt+Tab (useEffect re-initialization)

**Root cause**: `ChallengeCreatePage.tsx` lines 49-70 — two `useEffect` hooks depend on `[currentOrg]` and `[orgContext?.operatingModel]`. While `refetchOnWindowFocus` is globally `false`, any query invalidation (e.g., after draft save) creates a new object reference for `currentOrg` → useEffect fires → `setGovernanceMode(default)` overwrites user's manual selection → the `key={governanceMode-engagementModel}` on the form remounts the entire `ChallengeCreatorForm` → all data wiped.

**Fix**: Add `useRef` initialization guards so governance and engagement are only set once from server data. Manual user changes via `ChallengeConfigurationPanel` already call `setGovernanceMode` directly, which is unaffected.

**File: `src/pages/cogniblend/ChallengeCreatePage.tsx`**
- Import `useRef`
- Add `governanceInitialized` and `engagementInitialized` refs (default `false`)
- In the governance useEffect (line 49): early return if `governanceInitialized.current` is `true`; set it `true` after first initialization
- In the engagement useEffect (line 62): same pattern with `engagementInitialized.current`

### Bug 2 — Double Toast & isBusy Race on Submit

**Root cause**: Three layers of toast duplication:
1. `useSaveDraft.onSuccess` → `toast.success('Draft saved successfully')` (line 286)
2. `useUpdateDraft.onSuccess` → `toast.success('Draft updated successfully')` (line 314)
3. `useCreatorDraftSave.handleSaveDraft` → `toast.success('Draft updated'/'Draft saved')` (line 76)
4. `handleFillTestData` → `toast.success('Test data filled & saved as draft')` (line 193)

So "Fill Test Data" triggers up to 3 toasts. And `isBusy` stays true during draft save, blocking the submit button.

**Fix**:

**File: `src/hooks/cogniblend/useCreatorDraftSave.ts`**
- Remove `toast.success(...)` on line 76 — the mutation `onSuccess` handlers already toast

**File: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- In `handleFillTestData`: remove the `.then(() => toast.success('Test data filled & saved as draft'))` chain — just fire-and-forget `draftSave.handleSaveDraft()` since the mutation already toasts

### Summary of Changes

| File | Change |
|------|--------|
| `ChallengeCreatePage.tsx` | Add `useRef` guards to prevent re-initialization of governance/engagement |
| `useCreatorDraftSave.ts` | Remove duplicate `toast.success` (line 76) |
| `ChallengeCreatorForm.tsx` | Remove extra toast from `handleFillTestData` |

### Technical Notes
- `refetchOnWindowFocus` is already `false` globally, so the Alt+Tab issue only manifests when queries are invalidated (e.g., after draft save invalidates `cogni-dashboard`). The `useRef` guard is still essential because any invalidation path recreates the object reference.
- Removing the duplicate toast from `useCreatorDraftSave` is safe — `useSaveDraft.onSuccess` and `useUpdateDraft.onSuccess` already provide user feedback.
- The `isBusy` race is mitigated by removing the chained `.then()` in `handleFillTestData`, making the draft save non-blocking relative to the toast. The submit button will still be disabled while `isSaving` is true (correct behavior), but the user won't see confusing triple-toasts that suggest the operation is stuck.

