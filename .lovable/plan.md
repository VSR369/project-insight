

# Fix: Render Governance Config as Select Dropdowns

## Problem
Both governance parameters render as raw text/number inputs instead of user-friendly dropdowns:
- `platform_admin_tier_depth` shows a number input — should be a select with labels like "Supervisor Only (1)", "Supervisor + Senior Admin (2)", "Full Hierarchy (3)"
- `org_admin_delegation_enabled` shows a text input — should be a select with "Enabled" / "Disabled"

## Relationship Note
There is no hard technical dependency between the two — delegation works at any tier depth. The Supervisor (who always exists) handles approval workflows. The relationship is purely operational: at depth 1, one person handles everything including delegation approvals.

## Change

**`src/components/admin/system-config/ConfigParamRow.tsx`** — Add entries to the `ENUM_OPTIONS` map:

```ts
ENUM_OPTIONS = {
  org_verification_assignment_mode: [...], // existing
  platform_admin_tier_depth: [
    { value: '1', label: 'Supervisor Only (Single Operator)' },
    { value: '2', label: 'Supervisor + Senior Admin' },
    { value: '3', label: 'Full Hierarchy (Supervisor + Senior + Admin)' },
  ],
  org_admin_delegation_enabled: [
    { value: 'true', label: 'Enabled — PRIMARY + DELEGATED admins' },
    { value: 'false', label: 'Disabled — PRIMARY admin only' },
  ],
};
```

This leverages the existing `isEnumType` rendering path which already renders a `<Select>` dropdown — no other changes needed.

## Files
| File | Change |
|------|--------|
| `src/components/admin/system-config/ConfigParamRow.tsx` | Add 2 entries to `ENUM_OPTIONS` |

Single file, ~10 lines added.

