

# Fix: Context Library Drawer Header Buttons Not Visible

## Problem
The Context Library drawer opens but the header section (containing "Discover Sources", "Add URL" buttons, and search) is not visible. Only the body content ("No sources yet..." and "Select a source") appears.

## Root Cause
The `SheetContent` base variant class (`sheetVariants`) includes `p-6` padding. The drawer overrides with `p-0`, but Tailwind CSS class merging via `cn()` may not reliably resolve this conflict — `p-6` can win over `p-0` depending on CSS generation order. This can push the header off-screen or cause layout issues.

Additionally, the `sm:max-w-sm` in the sheet variant (line 41 of sheet.tsx) conflicts with the drawer's `sm:max-w-[900px]`. This is a second potential conflict point.

## Plan

### Step 1: Fix SheetContent class conflict in ContextLibraryDrawer
In `ContextLibraryDrawer.tsx`, replace the className approach with explicit `!p-0` (important modifier) or restructure to avoid the conflict:

```tsx
// Change line 63 from:
className="w-[900px] sm:max-w-[900px] p-0 flex flex-col overflow-hidden"
// To:
className="!w-[900px] !max-w-[900px] !p-0 flex flex-col overflow-hidden"
```

Using `!` (Tailwind important modifier) ensures these utilities override the base variant values.

### Step 2: Verify header visibility
After the fix, the `SheetHeader` with "Context Library" title, "Discover Sources" button, "Add URL" button, and search input should be fully visible at the top of the drawer.

### Files Changed
- `src/components/cogniblend/curation/ContextLibraryDrawer.tsx` — line 63, fix class specificity

