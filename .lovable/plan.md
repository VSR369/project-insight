

# Implement "Continue vs Save & Continue" + Data Persistence Across All Registration Steps

## Overview

Apply the same pattern already working on Step 1 (Organization Identity) to Steps 2-5: pre-populate forms from context on back-navigation, and show "Continue" when no changes are detected vs "Save & Continue" when data has been modified.

## Current State

| Step | Form | Pre-populates from context? | Continue/Save logic? |
|------|------|-----------------------------|---------------------|
| 1 - Organization | OrganizationIdentityForm | Yes (already fixed) | Yes (already fixed) |
| 2 - Contact | PrimaryContactForm | No -- hardcoded empty defaults | No -- always shows "Continue" |
| 3 - Compliance | ComplianceForm | No -- hardcoded empty defaults | No -- always shows "Continue to Plan Selection" |
| 4 - Plan Selection | PlanSelectionForm | Partially (tier_id, billing_cycle_id, engagement_model_id from state.step4) | No -- always shows "Continue" |
| 5 - Billing | BillingForm | Partially (some fields from step1/step2) | No -- always shows "Complete Registration" |

## Changes Per File

### 1. `PrimaryContactForm.tsx` (Step 2)

**Pre-populate from `state.step2`:**
- Read `state` from context (currently only destructures setters)
- Map `state.step2` fields to `defaultValues`: `first_name` from splitting `full_name`, `last_name`, `job_title` from `designation`, `email`, `phone_number` from `phone`, `phone_country_code`, `department`, `timezone`, `preferred_language_id`
- If `state.step2?.email_verified` is true, initialize `emailVerified` state to `true`

**Continue vs Save & Continue:**
- Add `isDirty` + `isReturning` check
- When no changes and org exists: show "Continue" button that just navigates to Step 3
- When changes detected: show "Save & Continue" that triggers the upsert mutation

**Note:** The `PrimaryContactData` type stores `full_name` as a single string but the form has `first_name` + `last_name`. The mapping will split on the first space. To avoid data loss, store the individual names in context. This requires adding `first_name` and `last_name` fields to `PrimaryContactData`.

### 2. `PrimaryContactData` type update (`types/registration.ts`)

Add `first_name` and `last_name` optional fields to `PrimaryContactData` so the form can round-trip individual name fields without lossy split logic:

```text
export interface PrimaryContactData {
  full_name: string;
  first_name?: string;   // NEW
  last_name?: string;    // NEW
  designation: string;
  ...
}
```

### 3. `ComplianceForm.tsx` (Step 3)

**Pre-populate from `state.step3`:**
- Read `state` from context
- Map `state.step3` fields to `defaultValues`: `export_control_status_id`, `itar_certified` from `is_itar_restricted`, `data_residency_id`

**Continue vs Save & Continue:**
- Same `isDirty` + `isReturning` pattern
- "Continue" navigates to Plan Selection without saving
- "Save & Continue" triggers the upsert mutation

**Guard country-dependent resets:**
- Same `useRef` pattern used in Step 1, applied to prevent ITAR fields from being wiped on remount

### 4. `PlanSelectionForm.tsx` (Step 4)

**Pre-populate:** Already partially done (tier_id, billing_cycle_id, engagement_model_id). Also restore the `isAnnual` toggle state from the billing cycle.

**Continue vs Save & Continue:**
- Same `isDirty` + `isReturning` pattern
- "Continue" navigates to Billing without saving
- "Save & Continue" saves step4 data to context then navigates

### 5. `BillingForm.tsx` (Step 5)

**Pre-populate from `state.step5`:**
- This is the final step and partially pre-populates from step1/step2 already
- Add pre-population of billing-specific fields (address, payment method, PO, tax ID) from a new extended `BillingData` type or store them in context on save

**Continue vs Save & Continue:**
- The final step button is "Complete Registration" which always saves, so this step only needs the data pre-population, not the Continue/Save toggle

### 6. `RegistrationContext.tsx`

No structural changes needed -- the context already supports `step2`, `step3`, `step4`, `step5` storage via `setStep2Data`, `setStep3Data`, etc. Only the `PrimaryContactData` type extension is needed.

## Summary of Pattern Applied to Each Form

```text
// 1. Read state from context
const { state, setStepNData, setStep } = useRegistrationContext();

// 2. Pre-populate defaultValues from state.stepN
const form = useForm({
  defaultValues: {
    field: state.stepN?.field ?? '',
    ...
  },
});

// 3. Detect returning user with no changes
const isReturning = !!state.organizationId;
const { isDirty } = form.formState;
const showContinueOnly = isReturning && !isDirty;

// 4. Continue-only handler (no save)
const handleContinueOnly = () => {
  setStep(nextStep);
  navigate(nextRoute);
};

// 5. Conditional button rendering
{showContinueOnly ? (
  <Button type="button" onClick={handleContinueOnly}>Continue</Button>
) : (
  <Button type="submit">Save & Continue</Button>
)}
```

## Files Changed

| File | Change |
|------|--------|
| `src/types/registration.ts` | Add `first_name`, `last_name` to `PrimaryContactData` |
| `src/components/registration/PrimaryContactForm.tsx` | Pre-populate from `state.step2`; add Continue vs Save & Continue logic; restore `emailVerified` from context |
| `src/components/registration/ComplianceForm.tsx` | Pre-populate from `state.step3`; add Continue vs Save & Continue logic |
| `src/components/registration/PlanSelectionForm.tsx` | Restore `isAnnual` from context; add Continue vs Save & Continue logic |
| `src/components/registration/BillingForm.tsx` | Pre-populate billing address fields from context if previously saved |

