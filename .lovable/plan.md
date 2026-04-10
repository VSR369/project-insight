

## Fix: "Component suspended while responding to synchronous input" on `/cogni/dashboard`

### Root Cause

`CogniShell` is lazy-loaded (line 9 of `App.tsx`) but serves as a **layout route element** — it wraps all `/cogni/*` child routes. When React Router performs a synchronous navigation (e.g., after auth redirect), `CogniShell` suspends before any child `<Suspense>` boundary can catch it, causing the crash.

Same pattern previously fixed for `Login`, `Register`, `Dashboard`, `Welcome`, `NotFound`.

### Fix

**File: `src/App.tsx`**

1. Change `CogniShell` from lazy to eager import:
   ```typescript
   // BEFORE (line 9):
   const CogniShell = lazy(() => import("@/components/cogniblend/shell/CogniShell").then(m => ({ default: m.CogniShell })));
   
   // AFTER:
   import { CogniShell } from "@/components/cogniblend/shell/CogniShell";
   ```

2. Change `CogniDashboardPage` from lazy to eager import (it's the primary post-login target for CogniBlend users):
   ```typescript
   // BEFORE (line 240):
   const CogniDashboardPage = lazy(() => import("@/pages/cogniblend/CogniDashboardPage"));
   
   // AFTER:
   import CogniDashboardPage from "@/pages/cogniblend/CogniDashboardPage";
   ```

3. Update the route element for `/cogni/dashboard` to remove the `<LazyRoute>` wrapper since it's now eager:
   ```typescript
   // BEFORE (line 355):
   <Route path="/cogni/dashboard" element={<LazyRoute><CogniDashboardPage /></LazyRoute>} />
   
   // AFTER:
   <Route path="/cogni/dashboard" element={<CogniDashboardPage />} />
   ```

All other CogniBlend pages remain lazy — they're accessed via explicit user clicks (not synchronous redirects), so Suspense works fine for them.

### Risk
Low. Only moves two imports from lazy to eager, adding minimal bundle overhead. The CogniShell component is small (~60 lines). CogniDashboardPage is the immediate landing page so it would be loaded anyway.

