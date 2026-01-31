
# Plan: Desktop Three-Column Layout with Sidebars + Daily Standup Page

## Problem Summary
The current Industry Pulse layout is mobile-first with a single narrow column (`max-w-lg mx-auto`). On desktop screens, this leaves significant empty space on both sides. Additionally, there's no dedicated Daily Standup page - it only exists as a dismissible banner.

## Current State
| Page | Exists | Status |
|------|--------|--------|
| Feed | ✅ | Working |
| Sparks | ✅ | Working |
| Cards | ✅ | Working |
| Create | ✅ | Working (7 content types) |
| Ranks | ✅ | Working (Galaxy Leaderboard) |
| Profile | ✅ | Working |
| Daily Standup | ❌ | Only exists as banner component |

## Solution Overview

### 1. Create Desktop Three-Column Layout
Transform the feed page to use a responsive three-column layout on desktop while maintaining the mobile single-column experience.

```
Desktop (lg+):
┌─────────────┬─────────────────────┬─────────────────┐
│ LEFT SIDEBAR│     MAIN FEED       │  RIGHT SIDEBAR  │
│  (280px)    │   (max-w-lg)        │    (320px)      │
├─────────────┼─────────────────────┼─────────────────┤
│ • Leaderboard│ • Feed header      │ • Daily Standup │
│   Mini Widget│ • Content posts    │   Full Widget   │
│ • Top 5 Ranks│ • Cards            │ • Loot Box CTA  │
│ • Your Rank  │                    │ • Pulse Metrics │
│ • XP Progress│                    │ • Trending Tags │
└─────────────┴─────────────────────┴─────────────────┘

Mobile/Tablet:
Single column with bottom nav (unchanged)
```

### 2. Create Dedicated Daily Standup Page
A full-page experience for daily standup with more features than the banner.

---

## Implementation Details

### Phase 1: Create Sidebar Widget Components

**1.1 Create `LeaderboardMiniWidget.tsx`**
Location: `src/components/pulse/widgets/LeaderboardMiniWidget.tsx`

Features:
- Top 5 ranked providers with avatars
- Current user's rank highlighted
- "View All" link to `/pulse/ranks`
- Compact card design
- Uses existing `useWeeklyLeaderboard` hook

**1.2 Create `DailyStandupWidget.tsx`**
Location: `src/components/pulse/widgets/DailyStandupWidget.tsx`

Features:
- Expanded version of DailyStandupBanner
- Shows more detail than banner
- Countdown timer
- Link to dedicated standup page
- Streak visualization

**1.3 Create `TrendingTopicsWidget.tsx`**
Location: `src/components/pulse/widgets/TrendingTopicsWidget.tsx`

Features:
- Trending hashtags/topics
- Content type breakdown
- Quick filter links

**1.4 Create `QuickActionsWidget.tsx`**
Location: `src/components/pulse/widgets/QuickActionsWidget.tsx`

Features:
- Loot box claim CTA (if available)
- Create content shortcuts
- Profile completion progress

### Phase 2: Create Desktop Layout Wrapper

**2.1 Create `PulseDesktopLayout.tsx`**
Location: `src/components/pulse/layout/PulseDesktopLayout.tsx`

Purpose: Three-column responsive layout
- Mobile: Single column (as today)
- Desktop (lg+): Left sidebar + Main + Right sidebar

Structure:
```tsx
<div className="flex min-h-screen bg-background">
  {/* Left Sidebar - hidden on mobile */}
  <aside className="hidden lg:block w-[280px] sticky top-14 h-[calc(100vh-56px)]">
    <LeftSidebarContent />
  </aside>
  
  {/* Main Content */}
  <main className="flex-1 max-w-lg mx-auto lg:mx-0">
    {children}
  </main>
  
  {/* Right Sidebar - hidden on mobile/tablet */}
  <aside className="hidden xl:block w-[320px] sticky top-14 h-[calc(100vh-56px)]">
    <RightSidebarContent />
  </aside>
</div>
```

**2.2 Create `LeftSidebar.tsx`**
Location: `src/components/pulse/layout/LeftSidebar.tsx`

Contents:
- LeaderboardMiniWidget
- XP Progress Card
- Navigation shortcuts

**2.3 Create `RightSidebar.tsx`**
Location: `src/components/pulse/layout/RightSidebar.tsx`

Contents:
- DailyStandupWidget
- QuickActionsWidget (Loot Box CTA)
- PulseMetricsCard (reuse existing)
- TrendingTopicsWidget

### Phase 3: Create Daily Standup Page

**3.1 Create `PulseStandupPage.tsx`**
Location: `src/pages/pulse/PulseStandupPage.tsx`

Features:
- Full standup experience (not just banner)
- Show industry updates/highlights from last 24h
- Quick reactions to content
- Streak calendar/history
- Rewards summary
- XP earned today breakdown
- "Complete Standup" action

**3.2 Add Route in App.tsx**
```tsx
<Route path="/pulse/standup" element={<AuthGuard><PulseStandupPage /></AuthGuard>} />
```

### Phase 4: Update Existing Components

**4.1 Update `PulseLayout.tsx`**
- Add responsive container that switches between mobile and desktop layouts
- Integrate sidebars for desktop view
- Keep mobile layout unchanged

**4.2 Update `PulseFeedPage.tsx`**
- Remove DailyStandupBanner from main content (moved to right sidebar)
- Adjust for new layout

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/pulse/widgets/index.ts` | Widget exports |
| `src/components/pulse/widgets/LeaderboardMiniWidget.tsx` | Top 5 leaderboard |
| `src/components/pulse/widgets/DailyStandupWidget.tsx` | Expanded standup widget |
| `src/components/pulse/widgets/TrendingTopicsWidget.tsx` | Trending topics |
| `src/components/pulse/widgets/QuickActionsWidget.tsx` | Quick actions panel |
| `src/components/pulse/layout/LeftSidebar.tsx` | Left sidebar container |
| `src/components/pulse/layout/RightSidebar.tsx` | Right sidebar container |
| `src/pages/pulse/PulseStandupPage.tsx` | Dedicated standup page |

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/layout/PulseLayout.tsx` | Add responsive three-column layout |
| `src/components/pulse/layout/index.ts` | Export new sidebar components |
| `src/pages/pulse/PulseFeedPage.tsx` | Adjust for new layout, move standup to sidebar |
| `src/pages/pulse/index.ts` | Export new standup page |
| `src/App.tsx` | Add `/pulse/standup` route |

---

## Responsive Breakpoint Strategy

| Screen Size | Layout |
|-------------|--------|
| Mobile (< 1024px) | Single column, bottom nav |
| Desktop (1024px - 1280px) | Main + Right sidebar |
| Large Desktop (1280px+) | Left sidebar + Main + Right sidebar |

---

## Technical Considerations

1. **Sidebar Sticky Positioning**: Use `sticky top-14` to account for fixed header (56px)
2. **Scroll Independence**: Each column scrolls independently
3. **Performance**: Widgets use existing hooks with appropriate `staleTime`
4. **Mobile Unchanged**: All mobile behavior preserved via responsive classes
5. **Reuse Existing Components**: PulseMetricsCard, leaderboard hooks already exist

---

## Expected Result

**Desktop View:**
- Left sidebar: Galaxy Leaderboard (Top 5), XP Progress
- Center: Main feed content
- Right sidebar: Daily Standup, Loot Box, Pulse Metrics, Trending

**Mobile View:**
- Unchanged single-column layout
- Bottom navigation with 6 items
- DailyStandupBanner shown at top of feed

**New Standup Page:**
- Accessible via link in widget or direct navigation
- Full daily standup experience with content highlights
- Streak tracking and rewards summary
