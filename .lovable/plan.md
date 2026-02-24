

# Root Cause Analysis: Registration Data Loss and Missing Per-Challenge Fee Tabs

## 5-Why Analysis

**Symptom:** Per-challenge fee tabs (Marketplace/Aggregator) are not visible on Step 4. Data entered in Steps 1-3 appears lost.

1. **Why are the Marketplace/Aggregator tabs not showing?**
   Because `PlanSelectionForm.tsx` line 533 checks `if (!state.step1?.hq_country_id)` and shows "Select country to see per-challenge fees" instead of the tabs. Also, `useBaseFeesByCountry` and `usePlatformFeesByCountry` have `enabled: !!countryId` -- when countryId is undefined, the queries never fire.

2. **Why is `state.step1?.hq_country_id` undefined on Step 4?**
   Because `state.step1` is `undefined`. The `RegistrationContext` has no data for Step 1.

3. **Why does the context have no Step 1 data when the user already filled it?**
   Because the `RegistrationContext` uses `useReducer` with **pure in-memory state** (line 96 of `RegistrationContext.tsx`). There is **zero persistence** -- no `sessionStorage`, no `localStorage`, no database rehydration.

4. **Why does in-memory state get lost?**
   Any of these scenarios wipes the context:
   - **Page refresh** (F5, browser reload) on any step
   - **Direct URL access** (typing `/registration/plan-selection` in address bar)
   - **React lazy route boundary** re-mounting the component tree
   - **Browser back/forward** in some edge cases
   The `RegistrationProvider` re-initializes with `initialState = { currentStep: 1 }` every time.

5. **Why was persistence never implemented?**
   The architecture correctly identified the need for a shared `RegistrationProvider` (via `RegistrationLayout`), but the implementation only handles the single-page-app navigation case. It missed the page refresh and direct access cases that are common during development and real usage.

## Impact Summary

| What breaks | Root cause |
|---|---|
| Per-challenge fee tabs invisible | `state.step1?.hq_country_id` is undefined -- no fallback |
| Org name shows "Your Organization" | `state.step1?.legal_entity_name` is undefined |
| Currency shows "USD" always | `state.localeInfo` is undefined |
| Org type flags (subsidized, zero-fee) lost | `state.orgTypeFlags` is undefined |
| Step 2 contact data unavailable | `state.step2` is undefined |
| Step 3 compliance data unavailable | `state.step3` is undefined |

## Two-Part Fix

### Part 1: Persist RegistrationContext to sessionStorage

**File: `src/contexts/RegistrationContext.tsx`**

Add sessionStorage persistence so context survives page refreshes:

1. On every dispatch (state change), serialize the updated state to `sessionStorage` under key `registration_wizard_state`
2. On provider mount, attempt to restore from `sessionStorage` -- if valid data exists, use it as the initial state instead of `{ currentStep: 1 }`
3. On `RESET` action, clear the sessionStorage key
4. Exclude non-serializable fields (like `File` objects in `verification_documents`) by stripping them before serialization

Implementation pattern:
```typescript
const STORAGE_KEY = 'registration_wizard_state';

function loadPersistedState(): RegistrationState {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch { /* ignore parse errors */ }
  return initialState;
}

function persistState(state: RegistrationState) {
  try {
    // Strip File objects (not serializable)
    const serializable = {
      ...state,
      step1: state.step1 ? {
        ...state.step1,
        logo_file: undefined,
        profile_document: undefined,
        verification_documents: undefined,
      } : undefined,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch { /* storage full or unavailable */ }
}
```

The reducer wrapper calls `persistState` after every state update. The provider initializes from `loadPersistedState()`.

### Part 2: Add Fallback Hooks for Base Fees and Platform Fees

Even with persistence, we should handle the edge case where country is not yet available (same pattern already used for subscription pricing via `useAllTierPricing`).

**File: `src/hooks/queries/usePlanSelectionData.ts`**

Add two new hooks:
- `useAllBaseFees()` -- fetches ALL `md_challenge_base_fees` rows (no country filter)
- `useAllPlatformFees()` -- fetches ALL `md_platform_fees` rows (no country filter)

### Part 3: Update PlanSelectionForm to Use Fallback Data

**File: `src/components/registration/PlanSelectionForm.tsx`**

1. Call the new `useAllBaseFees()` and `useAllPlatformFees()` alongside existing country-filtered hooks
2. Build `baseFeeArray` and `platformFeeArray` using the same fallback pattern as `pricingArray`:
   - If country-specific data exists, use it
   - Otherwise, deduplicate the "all fees" data by `tier_id + engagement_model_id`, preferring USD rows
3. Remove the `if (!state.step1?.hq_country_id)` gate on line 533 -- the tabs now always render using fallback USD data when no country is selected
4. Add a small "(USD)" note when showing fallback data

### Files Modified

| File | Change |
|---|---|
| `src/contexts/RegistrationContext.tsx` | Add sessionStorage persistence (load on mount, save on dispatch, clear on reset) |
| `src/hooks/queries/usePlanSelectionData.ts` | Add `useAllBaseFees()` and `useAllPlatformFees()` fallback hooks |
| `src/components/registration/PlanSelectionForm.tsx` | Use fallback fee arrays, remove country gate on per-challenge tabs, add "(USD)" fallback label |

### Edge Cases Handled

- **sessionStorage unavailable** (private browsing in some browsers): silently falls back to in-memory only -- same as current behavior
- **Corrupted stored data**: wrapped in try/catch, falls back to initial state
- **File objects in step1**: stripped before serialization (Files are not JSON-serializable)
- **Enterprise tier**: no per-challenge section (unchanged)
- **Internal departments**: shadow fee display (unchanged)

