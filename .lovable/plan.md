

# Fix: Blank Page on `/cogni/demo-login` (and all routes)

## Root Cause

In `src/App.tsx`, several heavy components are imported **eagerly** (lines 6-21):

```typescript
import { CogniShell } from "@/components/cogniblend/shell/CogniShell";   // line 8
import { OrgShell } from "@/components/org/OrgShell";                     // line 18
import { AdminShell } from "@/components/admin/AdminShell";               // line 13
```

These are large shell components with deep dependency trees. If **any one** fails to load (the browser logs show `OrgShell.tsx` returning a 503), the entire React app tree fails to initialize, producing a blank page on **every** route — including `/cogni/demo-login` which doesn't even use `OrgShell`.

The 503 is a transient dev-server issue, but the eager imports make it catastrophic rather than recoverable.

## Fix

Convert the three shell components (`OrgShell`, `CogniShell`, `AdminShell`) and `RegistrationLayout` from eager imports to `lazy()` imports. This way:
- A failed load only affects the route that needs that component
- Other routes (like `/cogni/demo-login`) render normally
- React's `Suspense` boundary catches the loading state gracefully

## Changes

| File | Change |
|------|--------|
| `src/App.tsx` | Convert `OrgShell`, `CogniShell`, `AdminShell`, `RegistrationLayout` from static imports to `lazy(() => import(...))`. Update their usages to be wrapped in `Suspense` (already handled by the layout routes they sit in, but verify). |

The guard components (`AuthGuard`, `AdminGuard`, `SeekerGuard`, etc.) are lightweight and can stay as eager imports since they're just permission wrappers.

