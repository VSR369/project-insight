

# Plan: Clear Navigation Design for Industry Pulse

## Problem Analysis

Based on the current implementation, there are **multiple overlapping navigation elements** causing confusion:

### Current Navigation Elements (Overlapping)

| Element | Location | Function | Problem |
|---------|----------|----------|---------|
| Dashboard Icon (`LayoutDashboard`) | Header Left | Exit to main app | Unclear purpose |
| Back Arrow (`ArrowLeft`) | Header Left (conditional) | Go back | Inconsistent: sometimes shown, sometimes not |
| "Pulse" Logo | Header Left | Brand | Competes with navigation icons |
| Bottom Nav (6 items) | Footer | Primary navigation | Works on mobile, hidden on desktop |
| Left Sidebar | Desktop | Leaderboard/XP widgets | Not navigation |
| Inline Back Buttons | Various pages | Go back | Duplicates header back button |

### Key Confusion Points

1. **Two exit mechanisms**: Dashboard icon vs Back arrow
2. **Inconsistent back button visibility**: Some pages show it, others don't
3. **No clear hierarchy labels**: Users don't know where they are in the app
4. **Desktop users have no persistent nav**: Bottom nav hidden on lg+

---

## Proposed Navigation Architecture

### Core Principles
1. **One clear exit to main app** (Dashboard)
2. **One clear back within Pulse** (contextual arrow)
3. **Breadcrumb trail showing hierarchy** on detail pages
4. **Consistent labeling** across all pages

---

### Navigation Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  MAIN APP (Dashboard)                                       │
│  └─── Industry Pulse (module boundary)                      │
│       │                                                     │
│       ├─── Feed (home)                                      │
│       │    └─── Content Detail → "← Feed / Post Title"      │
│       │    └─── Profile (public) → "← Feed / Username"      │
│       │                                                     │
│       ├─── Sparks (home)                                    │
│       │    └─── Content Detail → "← Sparks / Spark Title"   │
│       │                                                     │
│       ├─── Cards (home)                                     │
│       │    └─── Card Detail → "← Cards / Topic Name"        │
│       │                                                     │
│       ├─── Create (home)                                    │
│       │    └─── Creator Form → "← Create / Content Type"    │
│       │                                                     │
│       ├─── Ranks (home)                                     │
│       │                                                     │
│       ├─── Profile (own)                                    │
│       │                                                     │
│       ├─── Standup (linked from widget)                     │
│       │                                                     │
│       ├─── Search (linked from header)                      │
│       │                                                     │
│       └─── Notifications (linked from header)               │
└─────────────────────────────────────────────────────────────┘
```

---

## New Header Design

### Primary Pages (Feed, Sparks, Cards, Create, Ranks, Profile)

```
┌────────────────────────────────────────────────────────────┐
│ [←Dashboard]  Pulse                       [Search] [Bell]  │
└────────────────────────────────────────────────────────────┘

- Left: Dashboard exit icon with tooltip "Exit to Dashboard"
- Center-left: "Pulse" branding
- Right: Search + Notifications
- NO back button on primary pages (use bottom nav)
```

### Detail/Secondary Pages

```
┌────────────────────────────────────────────────────────────┐
│ [←]  Feed › Post Title                    [Search] [Bell]  │
└────────────────────────────────────────────────────────────┘

- Left: Single back arrow (goes to parent section)
- Center: Breadcrumb showing hierarchy (parent › current)
- Right: Search + Notifications
- NO dashboard icon (back arrow is sufficient)
```

---

## Implementation Details

### 1. Update `PulseHeader.tsx`

**New Props Interface:**
```typescript
interface PulseHeaderProps {
  // For primary pages (Feed, Sparks, etc.)
  isPrimaryPage?: boolean;
  
  // For detail pages - shows breadcrumb
  breadcrumb?: {
    parentLabel: string;    // e.g., "Feed", "Cards"
    parentPath: string;     // e.g., "/pulse/feed"
    currentLabel: string;   // e.g., "Post Title", "Topic Name"
  };
  
  // Optional: hide search/notifications (for create flow)
  hideActions?: boolean;
}
```

**Visual Design:**

| Page Type | Left Side | Right Side |
|-----------|-----------|------------|
| Primary (Feed, Sparks, Cards, Create, Ranks, Profile) | Dashboard Icon + "Pulse" | Search + Bell |
| Detail (Content, Card Detail, Public Profile) | Back Arrow + Breadcrumb | Search + Bell |
| Create Form | Back Arrow + "New [Type]" | X (Cancel) |
| Search/Notifications | Back Arrow + "Search"/"Notifications" | - |

---

### 2. Remove Inline Back Buttons

Currently, many pages have BOTH:
- Header back button
- Inline "← Back" button

**Remove inline back buttons from:**
- `PulseCreatePage.tsx` (line 116-119)
- `PulseContentDetailPage.tsx` (line 119-125)
- `PulsePublicProfilePage.tsx` (error state)
- `PulseCardDetailPage.tsx` (line 156-159)

---

### 3. Add Desktop Primary Navigation

Since bottom nav is hidden on desktop (lg+), add navigation to left sidebar:

**Update `LeftSidebar.tsx`:**
```typescript
// Add navigation section at top
<nav className="p-4 border-b">
  <NavLinks items={[
    { path: '/pulse/feed', label: 'Feed', icon: Home },
    { path: '/pulse/sparks', label: 'Sparks', icon: Zap },
    { path: '/pulse/cards', label: 'Cards', icon: Layers },
    { path: '/pulse/create', label: 'Create', icon: PlusCircle },
    { path: '/pulse/ranks', label: 'Ranks', icon: Trophy },
    { path: '/pulse/profile', label: 'Profile', icon: User },
    { path: '/pulse/standup', label: 'Daily Standup', icon: Flame },
  ]} />
</nav>
```

---

### 4. Page-by-Page Configuration

| Page | isPrimaryPage | breadcrumb | Notes |
|------|---------------|------------|-------|
| Feed | true | - | Primary, no back |
| Sparks | true | - | Primary, no back |
| Cards | true | - | Primary, no back |
| Create (type selection) | true | - | Primary, no back |
| Create (form) | false | {parent: "Create", current: "New Reel"} | Back to type selection |
| Ranks | true | - | Primary, no back |
| Profile (own) | true | - | Primary, no back |
| Content Detail | false | {parent: "Feed", current: "[Title]"} | Back to Feed |
| Spark Detail | false | {parent: "Sparks", current: "[Headline]"} | Back to Sparks |
| Card Detail | false | {parent: "Cards", current: "[Topic]"} | Back to Cards |
| Public Profile | false | {parent: "Feed", current: "[Name]"} | Back to Feed |
| Daily Standup | false | {parent: "Feed", current: "Daily Standup"} | Back to Feed |
| Search | false | - | Back to previous |
| Notifications | false | - | Back to previous |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/layout/PulseHeader.tsx` | Complete redesign with breadcrumb support |
| `src/components/pulse/layout/LeftSidebar.tsx` | Add desktop navigation links |
| `src/pages/pulse/PulseFeedPage.tsx` | Add `isPrimaryPage` prop |
| `src/pages/pulse/PulseSparksPage.tsx` | Add `isPrimaryPage` prop |
| `src/pages/pulse/PulseCardsPage.tsx` | Add `isPrimaryPage` prop |
| `src/pages/pulse/PulseCreatePage.tsx` | Add breadcrumb, remove inline back button |
| `src/pages/pulse/PulseRanksPage.tsx` | Add `isPrimaryPage` prop |
| `src/pages/pulse/PulseProfilePage.tsx` | Add `isPrimaryPage` prop |
| `src/pages/pulse/PulseContentDetailPage.tsx` | Add breadcrumb, remove inline back button |
| `src/pages/pulse/PulseCardDetailPage.tsx` | Add breadcrumb, remove inline back button |
| `src/pages/pulse/PulsePublicProfilePage.tsx` | Add breadcrumb |
| `src/pages/pulse/PulseStandupPage.tsx` | Add breadcrumb |

---

## Visual Summary

### Before (Confusing)
```
[Dashboard] [Back?] Pulse/Title/Nothing?    [Search] [Bell]
           ↑ inconsistent
```

### After (Clear)
```
Primary Pages:   [←Dashboard] Pulse            [Search] [Bell]
Detail Pages:    [←] Feed › Post Title         [Search] [Bell]
```

---

## Expected User Experience

1. **Primary Navigation**: Bottom nav (mobile) / Left sidebar (desktop)
2. **Exit to Main App**: Always visible dashboard icon on primary pages
3. **Back Within Pulse**: Clear back arrow on detail pages with breadcrumb
4. **Hierarchy Awareness**: Breadcrumb shows "where I am" (Feed › Post Title)
5. **Consistent Behavior**: Same pattern across all pages

