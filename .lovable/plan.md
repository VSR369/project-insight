

# Fix: "Create Role On Behalf" — Empty Organizations List

## Root Cause
In `ResourcePoolPage.tsx` line 182, the `organizations` prop is **hardcoded to an empty array**:
```tsx
<CreateOnBehalfSheet organizations={[]} />
```
No query ever fetches organizations to pass into this component.

## Fix

### 1. Wire up `useOrgPickerOptions` in `ResourcePoolPage.tsx`
- Import and call `useOrgPickerOptions()` (already exists in `src/hooks/queries/useOrgPicker.ts`)
- Map the results to `{ id, name }` format and pass to `CreateOnBehalfSheet`

```tsx
const { data: orgOptions = [] } = useOrgPickerOptions();
// ...
<CreateOnBehalfSheet
  organizations={orgOptions.map(o => ({ id: o.value, name: o.label }))}
/>
```

### 2. Verify `CreateRoleAssignmentInput` compatibility
The `CreateOnBehalfSheet.handleSubmit` calls `createAssignment.mutateAsync()` which inserts into `role_assignments`. The input shape already matches `CreateRoleAssignmentInput` — no changes needed there.

### 3. Verify `useCoreRoleCodes` works
Need to confirm this hook exists and returns data for the Core Role dropdown.

## Files Changed
| File | Change |
|---|---|
| `src/pages/admin/marketplace/ResourcePoolPage.tsx` | Import `useOrgPickerOptions`, pass fetched orgs to `CreateOnBehalfSheet` |

