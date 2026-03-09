

# Fix: Governance Group Not Visible in System Config Dashboard

## Problem

The `SystemConfigPage.tsx` uses a hardcoded `GROUP_ORDER` array and `GROUP_META` dictionary to control which parameter groups are rendered. The new `governance` group added by the migration is not included in either, so even if the migration runs, the parameters would be invisible.

Additionally, the migration inserts with `param_group = 'governance'` (lowercase), while all existing groups use UPPERCASE (`ASSIGNMENT`, `CAPACITY`, etc.).

## Changes

### 1. Fix migration: use uppercase `GOVERNANCE` for consistency

Update the migration SQL to use `GOVERNANCE` instead of `governance` to match the existing convention.

### 2. Add `GOVERNANCE` to `SystemConfigPage.tsx`

Add `GOVERNANCE` to both `GROUP_META` and `GROUP_ORDER`:

```
GROUP_META:
  GOVERNANCE: { title: 'Governance & Scaling', description: 'Platform admin tier depth and org admin delegation controls for scaling operations.' }

GROUP_ORDER: add 'GOVERNANCE' (first position — most important for platform setup)
```

### 3. Update `useTierDepthConfig.ts`

Update the config key lookup to match the uppercase group (no change needed — it reads by `param_key`, not `param_group`).

## Files to Edit

| File | Change |
|------|--------|
| `supabase/migrations/20260309234415_*.sql` | Change `governance` → `GOVERNANCE` |
| `src/pages/admin/system-config/SystemConfigPage.tsx` | Add `GOVERNANCE` to `GROUP_META` and `GROUP_ORDER` |

