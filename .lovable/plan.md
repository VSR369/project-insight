

# Plan: Add Standard Navigation to Industry Pulse & Profile Build Screens

## Problem Identified

From the screenshot, users on `/pulse/ranks` have no way to navigate to other Pulse pages on desktop:
- `PulseBottomNav` is hidden on desktop (`lg:hidden` class)
- `LeftSidebar` navigation was just removed (per last request)
- The main `AppSidebar` is NOT rendered in `PulseLayout`

This creates a **navigation dead-end** where users can see the Leaderboard but cannot navigate to Feed, Sparks, Create, Cards, or Profile.

---

## Navigation Architecture Analysis

| Context | Desktop Navigation | Mobile Navigation |
|---------|-------------------|-------------------|
| Main App (Dashboard, /profile, etc.) | `AppSidebar` with Pulse nav section | No explicit bottom nav |
| Pulse Pages (`/pulse/*`) | ❌ **MISSING** | `PulseBottomNav` (works) |

---

## Proposed Solution: Add Horizontal Quick-Nav Tab Strip

Instead of reinstating the full vertical navigation in `LeftSidebar`, add a **compact horizontal navigation strip** at the top of the Pulse content area. This provides:
1. Always-visible navigation on ALL Pulse pages (desktop AND mobile)
2. Consistent experience across devices
3. Doesn't duplicate the bottom nav on mobile (can hide strip on mobile)

---

## Changes Required

### 1. Create New Component: `PulseQuickNav.tsx`

A horizontal tab-style navigation bar that shows on desktop only:

```typescript
// src/components/pulse/layout/PulseQuickNav.tsx

const NAV_ITEMS = [
  { path: '/pulse/feed', label: 'Feed', icon: Home },
  { path: '/pulse/sparks', label: 'Sparks', icon: Zap },
  { path: '/pulse/cards', label: 'Cards', icon: Layers },
  { path: '/pulse/create', label: 'Create', icon: PlusCircle },
  { path: '/pulse/ranks', label: 'Ranks', icon: Trophy },
  { path: '/pulse/profile', label: 'Profile', icon: User },
];

export function PulseQuickNav() {
  // Horizontal button strip
  // Hidden on mobile (lg:flex hidden)
  // Shows current active state
}
```

**Visual Design:**
```
┌─────────────────────────────────────────────────────────────────┐
│ [🏠 Feed] [⚡ Sparks] [📚 Cards] [➕ Create] [🏆 Ranks] [👤 Profile] │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Update `PulseLayout.tsx`

Add `PulseQuickNav` inside the main content area, visible on desktop only:

```tsx
{/* Main Content */}
<main className="flex-1 overflow-y-auto min-w-0">
  {/* Desktop Quick Nav - visible when sidebars are shown */}
  {showSidebars && (
    <div className="hidden lg:block sticky top-0 z-10 bg-background border-b">
      <PulseQuickNav />
    </div>
  )}
  {children}
</main>
```

### 3. Export from `index.ts`

Add `PulseQuickNav` to the layout exports.

---

## Alternative: Show Bottom Nav on Desktop

A simpler approach would be to make `PulseBottomNav` visible on desktop too, but repositioned:
- Change `lg:hidden` to `lg:block lg:sticky lg:top-14 lg:border-b lg:pb-0`
- Adjust layout for horizontal display on larger screens

However, this would require significant restyling of the bottom nav for desktop.

---

## Recommended Approach

**Create `PulseQuickNav`** as a dedicated desktop navigation component because:
1. Cleaner separation of mobile vs desktop UX
2. Can style appropriately for each context
3. Doesn't affect existing mobile bottom nav behavior
4. Easier to maintain

---

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `src/components/pulse/layout/PulseQuickNav.tsx` | **CREATE** | New horizontal nav component |
| `src/components/pulse/layout/PulseLayout.tsx` | MODIFY | Add PulseQuickNav for desktop |
| `src/components/pulse/layout/index.ts` | MODIFY | Export PulseQuickNav |

---

## Visual Result After Implementation

**Desktop (≥1024px):**
```
┌─────────────────────────────────────────────────────────────────────────┐
│ [🏠] Pulse                                     [🔍] [🔔]              │ ← Header
├────────────────┬──────────────────────────────────────────┬────────────┤
│                │ [Feed] [Sparks] [Cards] [Create] [Ranks] [Profile]   │ ← QuickNav
│   Left Sidebar │──────────────────────────────────────────│ Right     │
│   (Leaderboard)│                                          │ Sidebar   │
│                │      Main Content Area                   │           │
│   (XP Card)    │                                          │           │
└────────────────┴──────────────────────────────────────────┴────────────┘
```

**Mobile (<1024px):**
```
┌─────────────────────────────────────┐
│ [🏠] Pulse            [🔍] [🔔]   │ ← Header
├─────────────────────────────────────┤
│                                     │
│       Main Content Area             │
│                                     │
├─────────────────────────────────────┤
│ [Feed] [Sparks] [+] [Ranks] [Profile]│ ← Bottom Nav (existing)
└─────────────────────────────────────┘
```

---

## Summary

This solution adds a dedicated `PulseQuickNav` component for desktop users to navigate between Pulse pages, solving the navigation dead-end without affecting mobile experience. The bottom nav continues to work on mobile, and desktop users get a clean horizontal tab strip.

