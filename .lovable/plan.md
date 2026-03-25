

# Fix: Regressions from UX Polish Changes

## Root Causes Identified

### Root Cause 1 — `SectionEmptyState` replaces children entirely (CRITICAL)

In `CuratorSectionPanel.tsx` lines 468-472, the new code:
```tsx
{isContentEmpty ? (
  <SectionEmptyState sectionKey={sectionKey} label={label} />
) : (
  children
)}
```

This was introduced in the UX polish. Before, `children` were **always** rendered. Now, when `filled` is false, `children` (which contain BOTH the content renderers AND the Edit button) are completely replaced by the empty state placeholder.

**Impact:** Edit buttons disappear for any section where `isFilled` returns false. Content that exists but doesn't pass the `isFilled` check is hidden.

### Root Cause 2 — AI divider gated on `filled` hides visual context

Line 488: `{aiReviewSlot && filled && (` — the divider only renders when filled. The `aiReviewSlot` itself renders unconditionally (line 499), but the visual separation is lost for unfilled sections, making AI suggestions appear disconnected.

### Root Cause 3 — `ScheduleTableSectionRenderer` doesn't re-sync edit state

The `editRows` state is initialized once via `useState(() => rows)`. When the user clicks Edit, if `data` changed since initial mount (e.g., after accepting an AI suggestion), the edit form shows stale/empty data because `useState` initializer only runs once.

## Fixes

### Fix 1 — Always render children, show empty state only as fallback
**File:** `CuratorSectionPanel.tsx` (lines 466-472)

Change from conditional replacement to always rendering children. Show `SectionEmptyState` only when the section has no content AND is not being edited (individual renderers already handle their own empty states like "None defined."). Remove the `isContentEmpty` gating entirely — children always render.

Also in the fullscreen modal (lines 543-549), apply the same fix.

### Fix 2 — Show AI divider regardless of filled state
**File:** `CuratorSectionPanel.tsx` (line 488)

Change `{aiReviewSlot && filled && (` to `{aiReviewSlot && (` — the divider should show whenever there's AI review content, regardless of whether the section is filled.

Same fix in fullscreen modal (line 553).

### Fix 3 — Re-sync editRows when entering edit mode
**File:** `ScheduleTableSectionRenderer.tsx`

Add a `useEffect` that resets `editRows` from the latest `data` prop when `editing` changes to `true`. This ensures the edit form always shows current data.

## Files Modified

| File | Change |
|------|--------|
| `CuratorSectionPanel.tsx` | Remove `isContentEmpty` conditional — always render children; fix AI divider gating |
| `ScheduleTableSectionRenderer.tsx` | Add useEffect to re-sync editRows when entering edit mode |

