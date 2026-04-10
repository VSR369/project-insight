

## Fill Test Data — Bug Fix Plan

### Problems Identified

**Bug 1: Evaluation criteria not appearing on first click (CONTROLLED/STRUCTURED)**
- `WeightedCriteriaEditor` uses `useFieldArray` which maintains its own internal field registry
- `form.reset()` updates form values but `useFieldArray`'s `fields` state doesn't re-sync on the same render cycle
- On second click, `useFieldArray` picks up the already-populated values from the previous reset

**Bug 2: Data not persisting on navigation or submit**
- `handleFillTestData` calls `form.reset(filtered)` which clears `isDirty` flag
- The `setTimeout(() => draftSave.handleSaveDraft(), 150)` fires before React has flushed the form state — `form.getValues()` may return stale values
- More critically: the `form.reset()` call resets `isDirty` to `false`, so `form.watch()` in `useFormPersistence` (if used) won't trigger a save
- The `weighted_criteria` field is stripped by `filterSeedByGovernance` when the governance key `weighted_criteria` is not in `FORM_FIELD_TO_GOVERNANCE_KEY` — checking: it IS missing from the mapping, meaning it's never stripped. But the `stripHiddenFields` function in `useSaveDraft` pathway uses `weightedCriteria` (camelCase) which IS also missing from the mapping. This is fine — unmapped fields pass through.
- The actual persistence issue: `form.reset()` replaces ALL values atomically, but the 150ms `setTimeout` for `handleSaveDraft` races with React's state updates. The draft save reads `form.getValues()` which may not yet reflect the reset values.

### Fix

**File 1: `src/components/cogniblend/creator/ChallengeCreatorForm.tsx`**
- In `handleFillTestData`, replace `form.reset(filtered)` with `form.reset(filtered, { keepDefaultValues: true })` — this ensures `useFieldArray` re-initializes its field registry
- Increase the setTimeout delay from 150ms to 300ms to ensure React has flushed the form state before draft save reads `form.getValues()`
- Add an explicit `form.trigger()` call after reset to force validation and ensure all field arrays are properly registered
- Alternatively (more robust): instead of setTimeout, use `requestAnimationFrame` + microtask to ensure the form state is flushed

**File 2: `src/components/cogniblend/creator/WeightedCriteriaEditor.tsx`**
- Add a `useEffect` that watches the form's `weighted_criteria` value via `useWatch` and forces `useFieldArray` to `replace()` when the external value changes but `fields` is empty — this handles the sync gap on `form.reset()`

### Technical Details
- `useFieldArray` in react-hook-form v7 has a known behavior where `form.reset()` doesn't always trigger a re-render of the field array component in the same cycle
- The fix uses `replace()` from `useFieldArray` which explicitly overwrites the field array's internal state
- For persistence: the 150ms delay is inherently fragile. A better pattern is to call `handleSaveDraft` directly after confirming form values are set, using `await` on a microtask

