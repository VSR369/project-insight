

## Problem

When navigating to `/registration/organization-identity` to register a **new** organization, the form is pre-populated with data from a **previous** registration stored in `sessionStorage`. This is both a UX bug and a security issue — one organization's data leaks into another registration session.

### Root Cause

1. `RegistrationProvider` calls `loadPersistedState()` on mount, which reads from `sessionStorage` key `registration_wizard_state`
2. `OrganizationIdentityForm` uses `state.step1?.field` as `defaultValues` — so old data fills the form
3. There is **no mechanism** to detect "starting fresh" vs. "resuming an in-progress registration"
4. The `reset()` function exists in the context but is **never called** at any entry point

### Fix

**Add a `?new=1` query parameter** to entry-point links (Login page, OrgContext fallback). When the `RegistrationLayout` mounts and detects `?new=1`, it calls `reset()` to clear sessionStorage before rendering the form.

#### Changes Required

**1. `src/components/layouts/RegistrationLayout.tsx`**
- Import `useSearchParams` from `react-router-dom` and `useRegistrationContext`
- On mount, check for `?new=1` search param
- If present, call `reset()` on the context and remove the param from the URL (to prevent re-clearing on refresh)

**2. `src/pages/Login.tsx`**
- Change the registration link from `/registration/organization-identity` to `/registration/organization-identity?new=1`

**3. `src/contexts/OrgContext.tsx`**
- Change the "Register Organization" link from `/registration/organization-identity` to `/registration/organization-identity?new=1`

**4. `src/components/registration/BillingForm.tsx`**
- After successful registration completion (before redirect to `/login`), call `reset()` to clear the sessionStorage — the registration is done, stale data should not persist

This ensures:
- **New registrations** always start with a blank form
- **In-progress registrations** (navigating between steps, page refresh) retain their data
- **Completed registrations** clean up after themselves

