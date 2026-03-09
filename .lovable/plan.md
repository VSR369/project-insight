

## Fix: Add Select Dropdown for Assignment Mode Configuration

### Problem
The `org_verification_assignment_mode` parameter renders as a plain text input because `ConfigParamRow` only has special handling for `UUID` (admin picker) and `INTEGER`/`DECIMAL` (number input). A `TEXT` param with two fixed valid values (`open_claim`, `auto_assign`) should render as a dropdown select.

### Solution

**1. Add ENUM support to `ConfigParamRow.tsx`**

Introduce a mapping of param keys to their valid enum options with display labels:

```typescript
const ENUM_OPTIONS: Record<string, { value: string; label: string }[]> = {
  org_verification_assignment_mode: [
    { value: 'open_claim', label: 'Open Claim (First-Come-First-Served)' },
    { value: 'auto_assign', label: 'Auto-Assignment (Scoring Engine)' },
  ],
};
```

In the editing UI, check if `ENUM_OPTIONS[entry.param_key]` exists. If so, render a `<Select>` dropdown with those options instead of the plain text input. This follows the same pattern already used for UUID admin pickers.

**2. No database changes needed** — the param stays as `TEXT` type; the UI handles the constrained selection.

### Files Changed

| File | Change |
|------|--------|
| `ConfigParamRow.tsx` | Add enum options map + render Select for enum-type params |

