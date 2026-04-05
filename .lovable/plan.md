

# 5-Why Analysis: Context Library Drawer Header Not Visible + End-to-End Discover Fix

## 5-Why Root Cause Analysis

**Why 1: Why aren't the "Discover Sources" / "Add URL" buttons visible?**
The SheetHeader containing these buttons renders inside the drawer but is visually hidden or clipped.

**Why 2: Why is the SheetHeader clipped?**
The SheetContent base variant in `sheet.tsx` (line 32) bakes in `p-6` and `gap-4`. The right-side variant (line 41) bakes in `sm:max-w-sm`. These conflict with the drawer's overrides (`!p-0`, `!max-w-[900px]`).

**Why 3: Why don't the `!important` overrides fix it?**
`tailwind-merge` (used by `cn()`) treats responsive-prefixed classes (`sm:max-w-sm`) and non-responsive classes (`!max-w-[900px]`) as different groups. It keeps BOTH, creating two competing max-width rules. Additionally, `gap-4` from the base is never overridden, adding unwanted spacing in the flex-col layout.

**Why 4: Why does keeping both rules cause the header to disappear?**
The combination of `sm:max-w-sm` (384px constraint at 640px+), `gap-4` (16px gap between flex children), `p-6` vs `!p-0` specificity battles, and `overflow-hidden` creates a layout where the SheetHeader content either collapses or gets clipped. The drawer width renders correctly at 900px (the `!important` wins for width), but internal layout calculations using the conflicting padding/gap values cause the header to have zero effective visible height.

**Why 5: Why does the base variant include these restrictive defaults?**
The shadcn Sheet component was designed for simple side panels (small width, internal padding). It was never designed for wide, custom-padded drawers like the 900px Context Library. The defaults are appropriate for typical use but create irreconcilable CSS conflicts for non-standard usages.

## Verified: Backend Works End-to-End

Tested `discover-context-resources` edge function directly — it returned 25 AI-suggested sources for C1 (AI-Driven Clinical Trial Patient Matching). All 25 records are in `challenge_attachments` with `discovery_status = 'suggested'`. The issue is purely UI.

## Fix Plan

### Step 1: Use inline `style` prop to bypass all CSS specificity issues

In `ContextLibraryDrawer.tsx`, add an inline `style` prop on SheetContent. Inline styles have highest CSS specificity and cannot be overridden by any class — this eliminates the twMerge/variant conflict entirely.

```tsx
<SheetContent
  side="right"
  className="flex flex-col overflow-hidden"
  style={{ padding: 0, width: 900, maxWidth: 900 }}
>
```

This removes the need for `!p-0`, `!w-[900px]`, `!max-w-[900px]` class hacks.

### Step 2: Override `gap-4` from base variant

The base variant's `gap-4` adds unwanted spacing in the flex-col layout. Add `gap-0` to the className to neutralize it:

```tsx
className="flex flex-col overflow-hidden gap-0"
```

### Step 3: Add explicit `sm:max-w-none` to neutralize responsive constraint

As a defense-in-depth measure, also add `sm:max-w-none` to ensure the `sm:max-w-sm` from the variant is overridden at the class level too:

```tsx
className="flex flex-col overflow-hidden gap-0 sm:max-w-none"
```

### Step 4: Verify header content renders with correct dimensions

Ensure SheetHeader has a minimum visible height so even if content is delayed, the area is reserved:

```tsx
<SheetHeader className="shrink-0 p-4 pb-3 border-b min-h-[4rem]">
```

### Files Changed
- `src/components/cogniblend/curation/ContextLibraryDrawer.tsx` — SheetContent className + style prop, SheetHeader min-height

### Verification After Fix
- Open curation page as nh-cu@testsetup.dev
- Click "Open Library" on any challenge
- Confirm header visible with: "Context Library" title, "Discover Sources" button, "Add URL" button, search input
- Click "Discover Sources" — should show spinner, then populate left panel with AI suggestions
- Accept a suggestion — should move to "accepted" group
- Click "Regenerate" on digest panel — should generate context digest

