
# Plan: Desktop Three-Column Layout with Sidebars + Daily Standup Page

## ✅ COMPLETED

## Problem Summary
The current Industry Pulse layout is mobile-first with a single narrow column (`max-w-lg mx-auto`). On desktop screens, this leaves significant empty space on both sides. Additionally, there's no dedicated Daily Standup page - it only exists as a dismissible banner.

## Implementation Status

### Phase 1: Sidebar Widget Components ✅
- [x] LeaderboardMiniWidget.tsx - Top 5 Galaxy leaderboard with rank changes
- [x] DailyStandupWidget.tsx - Expanded standup with timer, streak, rewards
- [x] TrendingTopicsWidget.tsx - Trending hashtags and content types
- [x] QuickActionsWidget.tsx - Loot box CTA, create shortcuts, profile progress
- [x] widgets/index.ts - Export barrel file

### Phase 2: Sidebar Containers ✅
- [x] LeftSidebar.tsx - LeaderboardMiniWidget + XP Progress + Navigation
- [x] RightSidebar.tsx - DailyStandupWidget + QuickActionsWidget + TrendingTopicsWidget

### Phase 3: Daily Standup Page ✅
- [x] PulseStandupPage.tsx - Full standup experience with streak calendar
- [x] Route added in App.tsx (/pulse/standup)
- [x] Exported from pages/pulse/index.ts

### Phase 4: Layout Updates ✅
- [x] PulseLayout.tsx - Three-column responsive layout
- [x] PulseFeedPage.tsx - Updated to pass provider info to layout
- [x] PulseSparksPage.tsx - Updated with sidebars
- [x] layout/index.ts - Export new components

---

## Final Layout

**Desktop (1280px+):**
```
┌─────────────┬─────────────────────┬─────────────────┐
│ LEFT SIDEBAR│     MAIN FEED       │  RIGHT SIDEBAR  │
│  (280px)    │   (flex-1)          │    (320px)      │
├─────────────┼─────────────────────┼─────────────────┤
│ • Galaxy    │ • Feed header       │ • Daily Standup │
│   Leaderboard│ • Content posts    │   Widget        │
│ • XP Progress│ • Cards            │ • Quick Actions │
│ • Navigation│                     │ • Trending      │
└─────────────┴─────────────────────┴─────────────────┘
```

**Tablet (1024px-1280px):**
- Main feed + Right sidebar only
- Left sidebar hidden

**Mobile (< 1024px):**
- Single column with bottom nav
- DailyStandupBanner shown inline (lg:hidden)
