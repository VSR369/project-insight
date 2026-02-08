
# Fix: Pulse Header Not Visible on Feed Pages

## Problem Identified
From your screenshot, the **PulseQuickNav** (Feed, Reels, Podcast tabs) appears at the very top of the page, but the **PulseHeader** (with Dashboard icon, "Pulse" branding, search, notifications, and avatar) is completely missing.

## Root Cause Analysis
After extensive code review and browser testing:

1. **Code is correct**: The `PulseLayout` component unconditionally renders `<PulseHeader>` on line 48
2. **Fixed positioning may be breaking in iframe context**: The header uses `fixed top-0 left-0 right-0 h-14 z-50` which can break in certain iframe/containment contexts
3. **The content wrapper has `pt-14`** (line 58) which should provide space for the header, but if the header isn't rendering/showing, the content appears flush to top

## Why My Browser Test Shows Header But Yours Doesn't
When I tested in the browser tool, the header was visible. This suggests the issue may be:
- Specific to the Lovable preview iframe environment
- Related to how the preview is embedded in the editor
- A CSS containment or transform context issue breaking fixed positioning

## Solution Approach

### Strategy: Convert Header from Fixed to Sticky-in-Flex
Instead of relying on `fixed` positioning (which can break in iframe contexts), we'll use a **sticky header within a flex container** pattern that's more robust:

### Changes Required

**File 1: `src/components/pulse/layout/PulseLayout.tsx`**
```tsx
// BEFORE (current)
<div className="min-h-screen bg-background flex flex-col">
  <PulseHeader ... />
  <div className="flex-1 overflow-hidden pt-14 pb-20 lg:pb-0">
    ...
  </div>
</div>

// AFTER (fixed)
<div className="min-h-screen bg-background flex flex-col overflow-hidden">
  {/* Header - sticky within flex container, not fixed */}
  <div className="flex-shrink-0">
    <PulseHeader ... />
  </div>
  
  <div className="flex-1 overflow-auto pb-20 lg:pb-0">
    {/* Remove pt-14 since header is in document flow */}
    ...
  </div>
</div>
```

**File 2: `src/components/pulse/layout/PulseHeader.tsx`**
```tsx
// BEFORE
<header className="fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50">

// AFTER - Use sticky positioning instead of fixed
<header className="sticky top-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-50">
```

### Why This Fix Works
1. **Sticky positioning within flex** works reliably in all iframe contexts
2. The header becomes part of the document flow, so it always renders
3. The `flex-shrink-0` ensures the header never collapses
4. The scroll happens in the content area below, keeping header always visible

### Files to Modify
1. `src/components/pulse/layout/PulseLayout.tsx` - Restructure to flex-with-sticky pattern
2. `src/components/pulse/layout/PulseHeader.tsx` - Change from `fixed` to `sticky`

### Also Need to Update (consistency)
3. `src/components/pulse/layout/PulseLayoutFirstTime.tsx` - Apply same pattern for first-time users

### Testing Checklist
After implementation:
- [ ] `/pulse/feed` - Header visible immediately with Dashboard icon, Pulse branding, search, notifications, avatar
- [ ] `/pulse/sparks`, `/pulse/reels`, etc. - Header visible on all filtered pages
- [ ] Scroll down - Header stays visible at top
- [ ] Mobile view - Header + bottom nav both visible
- [ ] "Build Profile" navigation accessible from header/sidebars
