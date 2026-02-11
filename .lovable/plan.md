

# Fix: State/Province Disappearing + Continue vs Save & Continue Button

## Root Causes Found

### Bug 1: State/Province wiped on back navigation
Line 124-126 has a `useEffect` that resets `state_province_id` to `''` whenever `watchedCountryId` changes:

```typescript
useEffect(() => {
  form.setValue('state_province_id', '');
}, [watchedCountryId, form]);
```

When the form remounts with saved data from context, the country ID is set via `defaultValues`, which triggers this effect and immediately blanks the state/province field. The fix is to track whether this is the initial mount and skip the reset on first render -- only reset when the user actively changes the country.

### Bug 2: No "Continue" vs "Save & Continue" logic
The button always shows "Save & Continue" regardless of whether data has changed. When returning to this step with no modifications, users should see a simple "Continue" button that skips the save and just navigates forward.

## Fix Plan

### 1. Guard the state reset effect (`OrganizationIdentityForm.tsx`)

Add a `useRef` to track the initial country value. Only reset `state_province_id` when the country actually changes from a previously set value (not on initial mount):

```text
const initialCountryRef = useRef(state.step1?.hq_country_id ?? '');

useEffect(() => {
  if (initialCountryRef.current && watchedCountryId === initialCountryRef.current) {
    return; // Same country as saved -- don't wipe state
  }
  if (initialCountryRef.current !== '') {
    // Country changed by user -- reset state/province
    form.setValue('state_province_id', '');
  }
  initialCountryRef.current = watchedCountryId;
}, [watchedCountryId, form]);
```

### 2. Conditional button: Continue vs Save & Continue (`OrganizationIdentityForm.tsx`)

Use `formState.isDirty` from react-hook-form to detect whether the user has modified any field:

- **No changes (`!isDirty`) and org already saved (`state.organizationId` exists)**: Show "Continue" button that just navigates to Step 2 without saving
- **Changes detected or first-time entry**: Show "Save & Continue" button that saves then navigates

```text
const isReturning = !!state.organizationId;
const { isDirty } = form.formState;

// In the button area:
if (isReturning && !isDirty) {
  // "Continue" button -- just navigate, no save
} else {
  // "Save & Continue" button -- save then navigate
}
```

A `handleContinueOnly` function will simply call `setStep(2)` and `navigate('/registration/primary-contact')` without triggering any mutations.

## Files Changed

| File | Change |
|------|--------|
| `src/components/registration/OrganizationIdentityForm.tsx` | Add `useRef` for initial country tracking to prevent state/province wipe on mount; add `isDirty`-based conditional button rendering with a `handleContinueOnly` handler |

