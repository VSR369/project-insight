

# Plan: Show Sidebars for First-Time Users with Onboarding Context

## Problem Analysis

The sidebars are **intentionally hidden** for first-time users based on this logic:

| File | Line | Code | Effect |
|------|------|------|--------|
| `PulseFeedPage.tsx` | 95 | `showSidebars={!isFirstTime}` | Hides sidebars when `isFirstTime === true` |
| `useIsFirstTimeProvider.ts` | 16 | `isFirstTime = !enrollments || enrollments.length === 0` | User has no enrollments |

**Why the banner shows:** The "Ready to stand out?" `ProfileBuildBanner` only appears for first-time users (line 99-103).

**Why sidebars are hidden:** The original design assumed first-time users shouldn't see sidebars, but this creates a confusing empty layout.

---

## Solution

**Show sidebars for ALL users**, but adapt the widget content for first-time users:
- Leaderboard: Show "Join to appear here" message
- Daily Standup: Show "Complete profile to track streaks"
- Quick Actions: Emphasize "Build Profile" CTA

---

## Changes Required

### 1. Update `PulseFeedPage.tsx`

**Change:** Always show sidebars regardless of first-time status

```tsx
// Line 91-96 - Change showSidebars to always true
<PulseLayout 
  isPrimaryPage={true}  // Always primary page
  providerId={provider?.id} 
  isFirstTime={isFirstTime}
  showSidebars={true}  // ← Always show sidebars
>
```

### 2. Update `LeftSidebar.tsx`

**Add:** First-time user state for leaderboard widget

```tsx
interface LeftSidebarProps {
  providerId?: string;
  isFirstTime?: boolean;  // Add this prop
  className?: string;
}

// Pass isFirstTime to LeaderboardMiniWidget
<LeaderboardMiniWidget isFirstTime={isFirstTime} />
```

### 3. Update `LeaderboardMiniWidget.tsx`

**Add:** Onboarding message for first-time users

```tsx
// When isFirstTime, show motivational message
{isFirstTime && (
  <div className="text-center py-6 text-muted-foreground">
    <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
    <p className="text-sm">Build your profile to join the rankings!</p>
  </div>
)}
```

### 4. Update `RightSidebar.tsx` 

**Already has `isFirstTime` prop** - Just verify it passes correctly to widgets

### 5. Update `DailyStandupWidget.tsx`

**Add:** First-time state

```tsx
{isFirstTime ? (
  <div className="text-center py-4">
    <p className="text-sm text-muted-foreground">
      Complete your profile to start tracking daily streaks
    </p>
  </div>
) : (
  // Existing standup content
)}
```

### 6. Update `QuickActionsWidget.tsx`

**Already adapts to first-time users** - The profile progress indicator adjusts based on `profileProgress` prop

### 7. Update `PulseLayout.tsx`

**Add:** Pass `isFirstTime` to LeftSidebar

```tsx
<LeftSidebar providerId={providerId} isFirstTime={isFirstTime} />
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/pulse/PulseFeedPage.tsx` | Set `showSidebars={true}` always |
| `src/components/pulse/layout/PulseLayout.tsx` | Pass `isFirstTime` to LeftSidebar |
| `src/components/pulse/layout/LeftSidebar.tsx` | Accept and pass `isFirstTime` prop |
| `src/components/pulse/widgets/LeaderboardMiniWidget.tsx` | Add first-time user state |
| `src/components/pulse/widgets/DailyStandupWidget.tsx` | Add first-time user message |

---

## Expected Result

### Before (Current - Empty)
```
┌────────────────────────────────────────────────────┐
│                    MAIN FEED                       │
│              (no left/right sidebars)              │
│                                                    │
└────────────────────────────────────────────────────┘
```

### After (Fixed - Full Layout)
```
┌──────────┬──────────────────────┬──────────────────┐
│ LEFT     │     MAIN FEED        │   RIGHT          │
│ SIDEBAR  │                      │   SIDEBAR        │
├──────────┼──────────────────────┼──────────────────┤
│ [Leader- │ Profile Build Banner │ [Daily Standup]  │
│  board]  │                      │ "Complete profile│
│ "Build   │ Feed Content         │  to track..."    │
│  profile │                      │                  │
│  to join │                      │ [Quick Actions]  │
│  ranks"  │                      │ Build Profile CTA│
└──────────┴──────────────────────┴──────────────────┘
```

---

## Technical Notes

1. **No breaking changes** - Just enabling existing sidebar components
2. **Graceful degradation** - Widgets adapt their content based on `isFirstTime` prop
3. **Consistent with other pages** - Other Pulse pages (Sparks, Cards, Ranks) may need same fix
4. **Desktop-only** - Sidebars are still hidden on mobile (responsive design preserved)

