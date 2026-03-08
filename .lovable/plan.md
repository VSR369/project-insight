

# Fix: "Component is not a function" Crash on Team Performance Dashboard

## Root Cause

The `WorkloadBar` component was recently changed from a plain function component to a `forwardRef` component. No consumer actually passes a `ref` to it — the change was unnecessary. The `forwardRef` wrapper is causing a "Component is not a function" runtime error at `renderWithHooks`, which crashes the entire Performance page and gets caught by the `FeatureErrorBoundary`.

This is a known React/Vite issue where `forwardRef` components can produce stale module references during HMR, and sometimes in production builds when the component identity changes unexpectedly.

## Fix

**Revert `WorkloadBar.tsx` back to a plain function component.** Remove the `forwardRef` wrapper since no consumer needs it.

| File | Change |
|------|--------|
| `src/components/admin/platform-admins/WorkloadBar.tsx` | Remove `forwardRef`, revert to plain function export |

The component will go from:
```tsx
export const WorkloadBar = forwardRef<HTMLDivElement, WorkloadBarProps>(
  function WorkloadBar({ current, max, className }, ref) { ... }
);
```
Back to:
```tsx
export function WorkloadBar({ current, max, className }: WorkloadBarProps) { ... }
```

No other files need changes — all imports use `{ WorkloadBar }` named import which works with both patterns.

