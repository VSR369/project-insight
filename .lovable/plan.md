

# Fix: "All" Toggle Switches Cannot Be Untoggled

## Root Cause

The "All" state is **derived** from empty arrays:
```typescript
const allIndustries = allowAll && value.industry_segment_ids.length === 0;
```

When the user turns OFF the toggle, `toggleAllIndustries(false)` does nothing — the array is already empty, so `allIndustries` stays `true`. The switch is stuck ON.

This is a state ambiguity: **empty array means both "ALL selected" and "nothing selected yet."**

## Fix

Use **local `useState` booleans** for each "All" toggle, initialized from the incoming value. This decouples the toggle UI state from the array contents.

### Changes in `ScopeMultiSelect.tsx`

1. Add four `useState` hooks (only active when `allowAll=true`):
   ```typescript
   const [isAllIndustries, setIsAllIndustries] = useState(
     allowAll && value.industry_segment_ids.length === 0
   );
   // Same for proficiency, sub-domains, specialities
   ```

2. Sync state when `value` prop changes externally (e.g., form reset for edit mode) via `useEffect`.

3. Replace derived `allIndustries` / `allProficiency` / etc. with the state booleans.

4. Fix toggle handlers:
   - **ON**: clear the array (empty = ALL) + set state `true`
   - **OFF**: keep array empty but set state `false` — now the multi-select picker appears and user can make selections

5. The visibility logic (`showProficiency`, etc.) uses the state booleans instead of derived values.

### Files Changed

| File | Change |
|---|---|
| `src/components/org/ScopeMultiSelect.tsx` | Replace derived "All" booleans with `useState` + `useEffect` sync; fix toggle handlers |

One file, ~20 lines changed.

