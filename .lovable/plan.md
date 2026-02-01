
# Layout Fix for Industry Pulse Sidebars

## Problem Summary

The screenshot shows two distinct issues after publishing:
1. **Left sidebar invisible/hidden** - Should be visible on XL screens (1280px+)
2. **Right sidebar clipped** - Content is being cut off at the right edge

## Root Cause Analysis

After analyzing the codebase, I identified these issues:

| Issue | Location | Current Code | Problem |
|-------|----------|--------------|---------|
| Viewport overflow | `PulseLayout.tsx` | No overflow control on outer wrapper | Content can extend beyond viewport |
| Sidebar width mismatch | `PulseLayout.tsx` line 62, 80 | Left: `w-64 2xl:w-72`, Right: `w-72 xl:w-80` | Asymmetric widths cause imbalance |
| Header constraint | `PulseHeader.tsx` line 86 | `max-w-7xl mx-auto` | Header is constrained but content is not |
| Missing `min-w-0` | Main content | `flex-1 overflow-y-auto min-w-0` | Good, but parent needs constraint |

## Solution Plan

### 1. Add Viewport Constraint to PulseLayout

**File:** `src/components/pulse/layout/PulseLayout.tsx`

**Change the outer container wrapper:**

```tsx
// Current (line 46-47):
<div className="min-h-screen bg-background flex flex-col">

// Updated:
<div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
```

### 2. Add Container Constraint on Three-Column Flex Layout

**File:** `src/components/pulse/layout/PulseLayout.tsx`

**Wrap the three-column layout with a max-width constraint:**

```tsx
// Current (lines 58-59):
<div className="flex-1 overflow-hidden pt-14 pb-20 lg:pb-0">
  <div className="flex h-full">

// Updated:
<div className="flex-1 overflow-hidden pt-14 pb-20 lg:pb-0">
  <div className="flex h-full w-full max-w-[1920px] mx-auto">
```

This ensures:
- Content is centered on very wide screens
- Sidebars don't extend infinitely
- Max width of 1920px covers most desktop monitors

### 3. Ensure Main Content Has Proper Constraints

**File:** `src/components/pulse/layout/PulseLayout.tsx`

**Update main element (line 68):**

```tsx
// Current:
<main className="flex-1 overflow-y-auto min-w-0">

// Updated (add overflow-x-hidden for safety):
<main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
```

### 4. Fix Header to Match Content Width

**File:** `src/components/pulse/layout/PulseHeader.tsx`

**Update header container (line 86):**

```tsx
// Current:
<div className="h-full w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between">

// Updated (remove max-w-7xl to span full width like the content below):
<div className="h-full w-full max-w-[1920px] mx-auto px-3 sm:px-4 lg:px-6 flex items-center justify-between">
```

### 5. Synchronize Sidebar Breakpoints (Optional Enhancement)

Currently:
- Left sidebar: `hidden xl:flex` (1280px+)
- Right sidebar: `hidden lg:flex` (1024px+)

This is intentional per the memory context (left at XL, right at LG), but to ensure consistency, verify both sidebars use `flex-shrink-0` (already present).

---

## Summary of Changes

| File | Line(s) | Change |
|------|---------|--------|
| `PulseLayout.tsx` | 46 | Add `overflow-x-hidden` to root |
| `PulseLayout.tsx` | 59 | Add `w-full max-w-[1920px] mx-auto` to flex container |
| `PulseLayout.tsx` | 68 | Add `overflow-x-hidden` to main element |
| `PulseHeader.tsx` | 86 | Change `max-w-7xl` to `max-w-[1920px]` |

---

## Technical Verification

After these changes, verify:
- [ ] Left sidebar visible on screens ≥1280px (XL breakpoint)
- [ ] Right sidebar visible on screens ≥1024px (LG breakpoint)
- [ ] No horizontal scrollbar appears at any width
- [ ] Sidebars are fully visible without clipping
- [ ] Layout is centered on ultra-wide monitors (>1920px)
- [ ] Mobile/tablet layouts unaffected (sidebars hidden)
