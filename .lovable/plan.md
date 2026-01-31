

# Plan: Remove Navigation from Left Sidebar, Keep Provider Info & Leaderboard

## Current Structure

The `LeftSidebar` component currently has 3 sections:

```
┌─────────────────────────────┐
│  Desktop Navigation         │  ← REMOVE THIS
│  (Feed, Sparks, Cards, etc.)│
├─────────────────────────────┤
│  Galaxy Leaders (Leaderboard)│  ← KEEP THIS
├─────────────────────────────┤
│  Your Progress (XP Card)    │  ← KEEP THIS
│  - Provider Photo + Level   │
│  - XP Progress bar          │
│  - Stats (Impressions/Rank) │
└─────────────────────────────┘
```

## After Changes

```
┌─────────────────────────────┐
│  Galaxy Leaders (Leaderboard)│
├─────────────────────────────┤
│  Your Progress (XP Card)    │
│  - Provider Photo + Level   │
│  - XP Progress bar          │
│  - Stats (Impressions/Rank) │
└─────────────────────────────┘
```

---

## Changes Required

### File: `src/components/pulse/widgets/StartPostWidget.tsx`

**Remove:**
- `NAV_ITEMS` constant (lines 27-35)
- The entire `<nav>` section (lines 66-92)
- Unused imports: `Home`, `Layers`, `PlusCircle`, `Trophy`, `User`, `Flame`
- Unused hooks: `useNavigate`, `useLocation`
- Unused variables: `currentPath`, `isActive` function

**Keep:**
- `LeaderboardMiniWidget` component
- `XP Progress Card` with provider photo, level, and stats

---

## Final LeftSidebar Structure

```tsx
export function LeftSidebar({ providerId, isFirstTime, className }: LeftSidebarProps) {
  const { data: stats, isLoading: statsLoading } = useProviderStats(providerId || '');
  const { data: metrics, isLoading: metricsLoading } = usePulseMetrics(providerId || '');
  const isLoading = statsLoading || metricsLoading;

  return (
    <div className={cn("p-4 space-y-4 overflow-y-auto", className)}>
      {/* Galaxy Leaderboard */}
      <LeaderboardMiniWidget currentProviderId={providerId} isFirstTime={isFirstTime} />

      {/* XP Progress Card with Provider Photo */}
      {providerId && (
        <Card>
          {/* ... existing XP card content ... */}
        </Card>
      )}
    </div>
  );
}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/layout/LeftSidebar.tsx` | Remove nav section and unused imports |

---

## Visual Result

**Before:**
```
[Feed]
[Sparks] 
[Cards]
[Create]
[Ranks]
[Profile]
[Daily Standup]

┌─ Galaxy Leaders ──┐
│ ...               │
└───────────────────┘

┌─ Your Progress ───┐
│ [Photo] Level 1   │
│ Progress bar      │
│ Impressions | Rank│
└───────────────────┘
```

**After:**
```
┌─ Galaxy Leaders ──┐
│ ...               │
└───────────────────┘

┌─ Your Progress ───┐
│ [Photo] Level 1   │
│ Progress bar      │
│ Impressions | Rank│
└───────────────────┘
```

The navigation is already available in the main `AppSidebar` (under "Industry Pulse" section) and via the mobile bottom navigation bar, so removing it from `LeftSidebar` avoids duplication.

