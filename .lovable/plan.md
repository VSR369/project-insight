

## Fix: `useFormContext` is null — FormLabel Used Outside Form Provider

### Root Cause

In `src/components/org-settings/ProfileTab.tsx`, the `LockedField` helper component (line 117-128) uses `<FormLabel>` from the shadcn form primitives. `FormLabel` internally calls `useFormField()` which calls `useFormContext()`. The `LockedField` component is rendered **outside** of the `<Form>` provider (lines 136-143), so `useFormContext()` returns `null`, causing the crash.

The same issue occurs at line 147 where `FormLabel` is used for the "Industries" label — also outside the `<Form>` wrapper.

### Fix

Replace `FormLabel` with the plain `Label` component (from `@/components/ui/label`) in the `LockedField` helper and the Industries label. These are read-only display elements that have no form field association, so they should never use `FormLabel`.

### File to Modify

| File | Change |
|------|--------|
| `src/components/org-settings/ProfileTab.tsx` | Replace `FormLabel` with `Label` in `LockedField` (line 120) and Industries label (line 147) |

### Details

Line 120: Change `<FormLabel className="...">` to `<Label className="...">`
Line 147: Change `<FormLabel className="...">` to `<Label className="...">`

Add `import { Label } from '@/components/ui/label';` if not already imported.

No other files are affected — `AdminDetailsTab.tsx` correctly uses `FormLabel` only inside `<Form>` and `<FormField>`.

