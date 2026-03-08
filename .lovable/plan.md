

# Root Cause Analysis: "Component is not a function" — Recurring Crash

## Five Whys Analysis

1. **Why does the Platform Admin List crash?**
   The error `TypeError: Component is not a function` fires at React's `updateForwardRef` internal, meaning React encounters a `forwardRef` component whose inner render function is `undefined`.

2. **Why is the render function undefined?**
   Vite's HMR (Hot Module Replacement) replaces the module but the `forwardRef` wrapper retains a stale reference to the old render function. After HMR, the wrapper exists but its inner function is gone.

3. **Why does HMR break these specific components?**
   Three components used in the admin table rows are wrapped in `React.forwardRef` unnecessarily:
   - `AdminStatusBadge` (forwardRef — **no consumer ever passes a ref**)
   - `ExpertiseTags` (forwardRef — **no consumer ever passes a ref**, AND it calls hooks inside the forwardRef render function, which is an additional anti-pattern)
   - `AssignmentPriorityBadge` is a plain function (no issue)
   - `WorkloadBar` is a plain function (no issue — we already reverted this)

4. **Why are they wrapped in forwardRef if no one passes refs?**
   They were preemptively wrapped "to prevent React ref warnings when used inside DataTable's flexRender" — but these components are NOT used inside a DataTable/flexRender. They are used in plain JSX `<TableCell>` elements where no ref is forwarded.

5. **Why does the problem recur after fixes?**
   The `vite.config.ts` is also missing `resolve.dedupe` for React, which can cause multiple React instances in the bundle. Each instance has its own `forwardRef` implementation, and cross-instance `forwardRef` components break silently. This is a known Vite issue documented in their troubleshooting.

## Evidence

- Stack trace: `updateForwardRef` → confirms forwardRef component failure
- `AdminStatusBadge.tsx` line 33: `React.forwardRef<HTMLDivElement, AdminStatusBadgeProps>` — unnecessary
- `ExpertiseTags.tsx` line 12: `React.forwardRef<HTMLDivElement, ExpertiseTagsProps>` — unnecessary AND calls `useExpertiseLabels` hook inside forwardRef render
- `vite.config.ts`: no `resolve.dedupe` configured
- User confirms: "Refresh fixes it" — classic HMR staleness symptom

## Fixes (3 files)

### 1. `src/components/admin/platform-admins/AdminStatusBadge.tsx`
Convert from `forwardRef` to plain function component. No consumer passes a ref.

### 2. `src/components/admin/platform-admins/ExpertiseTags.tsx`
Convert from `forwardRef` to plain function component. No consumer passes a ref. Hooks inside forwardRef render is an anti-pattern that compounds HMR issues.

### 3. `vite.config.ts`
Add `resolve.dedupe: ['react', 'react-dom', 'react/jsx-runtime']` to force a single React instance, preventing the secondary cause of forwardRef breakage.

## What NOT to change
- UI primitive components (`Badge`, `Table`, `Card`, etc.) correctly use forwardRef because Radix UI passes refs to them
- `StatusBadge` in `src/components/admin/StatusBadge.tsx` — used inside DataTable's flexRender, so forwardRef is legitimately needed there
- No query keys, DB schema, RLS, or business logic changes

## Risk: Low
These are the same components that have been crashing repeatedly. Converting to plain functions is the same fix that resolved `WorkloadBar`. Adding `dedupe` is a standard Vite best practice.

