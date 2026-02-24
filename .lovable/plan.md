

## Confirmation of Your Requirement

You are asking for TWO behaviors to coexist:

| Scenario | Expected Behavior |
|---|---|
| **New org sign-up** (clicking "Register Organization") | All forms start **completely blank** |
| **In-progress registration** (navigating between steps, refreshing page, even logging out and back in) | Data **persists** — no re-entry needed |

**Confirmed.** The `sessionStorage` persistence is correct and must stay. The only problem is that starting a NEW registration doesn't clear the old data before the forms initialize.

---

## 5 WHY Root Cause Analysis

**WHY 1:** Old org data appears in the form when starting a new registration.
Because `OrganizationIdentityForm` sets `defaultValues: { legal_entity_name: state.step1?.legal_entity_name ?? '' }` and `state` contains old data at mount time.

**WHY 2:** `state` contains old data when the form mounts.
Because `RegistrationProvider` calls `loadPersistedState()` which reads stale data from `sessionStorage` before any reset logic executes.

**WHY 3:** Reset logic doesn't execute before the provider reads storage.
Because `RegistrationResetGuard` calls `reset()` inside a `useEffect`, which runs AFTER the first render — by then, the provider already loaded old data and the form already initialized.

**WHY 4:** Even after `useEffect` fires and clears context, the form still shows old data.
Because React Hook Form's `defaultValues` are set once on mount and are **immutable**. Updating context state on a second render cycle doesn't change the already-initialized form fields.

**WHY 5:** Why was the fix designed as a post-mount effect?
Because the `RegistrationResetGuard` sits INSIDE the `RegistrationProvider`, so it can only act after the provider has already loaded from storage. The clearing must happen BEFORE the provider mounts.

```text
Timeline of the bug:

1. User clicks "Register Organization" → /registration/organization-identity?new=1
2. RegistrationLayout renders
3.   └─ RegistrationProvider mounts → loadPersistedState() → READS OLD DATA
4.       └─ RegistrationResetGuard mounts (inside provider)
5.           └─ OrganizationIdentityForm mounts → useForm({ defaultValues: OLD DATA })
6.               └─ FIRST PAINT: old data visible in fields
7.                   └─ useEffect fires → reset() clears context
8.                       └─ BUT form fields are FROZEN with old defaults
```

---

## Permanent Fix

**Clear `sessionStorage` synchronously in `RegistrationLayout` BEFORE `RegistrationProvider` mounts.** This way `loadPersistedState()` finds nothing and returns blank initial state.

### Change 1: `src/components/layouts/RegistrationLayout.tsx`

Replace the entire file. Remove `RegistrationResetGuard`. Add synchronous clearing before the provider:

```typescript
import { Outlet } from 'react-router-dom';
import { RegistrationProvider } from '@/contexts/RegistrationContext';

const STORAGE_KEY = 'registration_wizard_state';

export function RegistrationLayout() {
  // Synchronous check BEFORE RegistrationProvider mounts.
  // If ?new=1 is present, clear sessionStorage so loadPersistedState()
  // returns initialState (blank form). Then strip the param from URL.
  const params = new URLSearchParams(window.location.search);
  if (params.get('new') === '1') {
    sessionStorage.removeItem(STORAGE_KEY);
    params.delete('new');
    const search = params.toString();
    const newUrl = window.location.pathname + (search ? '?' + search : '');
    window.history.replaceState({}, '', newUrl);
  }

  return (
    <RegistrationProvider>
      <Outlet />
    </RegistrationProvider>
  );
}
```

**Why this works:**
- The `if` block runs during the render phase, synchronously, BEFORE `RegistrationProvider` mounts
- When `RegistrationProvider` then calls `loadPersistedState()`, `sessionStorage` is empty → returns blank `initialState`
- `OrganizationIdentityForm` gets `state.step1` as `undefined` → all `defaultValues` are `''`
- No timing race. No useEffect. No second render needed.

**Why persistence is preserved:**
- This only triggers when `?new=1` is in the URL (only on entry-point links)
- Normal page refreshes or step navigation don't have `?new=1` → storage is untouched → data persists
- Logout/login doesn't clear `sessionStorage` → data survives

No other files need changes. `Login.tsx`, `OrgContext.tsx`, and `BillingForm.tsx` already have the correct `?new=1` param and `reset()` call from the previous edit.

