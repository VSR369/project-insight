
# Add PersonalizedFeedHeader to All Individual Feed Pages

## Problem Confirmed

The `PersonalizedFeedHeader` with the "Build Profile" / "View Profile" button was only added to the main `PulseFeedPage` (`/pulse/feed`), but the 5 individual content-type feed pages are missing it:

| Page | Route | Status |
|------|-------|--------|
| PulseReelsPage | `/pulse/reels` | Missing header |
| PulsePodcastsPage | `/pulse/podcasts` | Missing header |
| PulseSparksPage | `/pulse/sparks` | Missing header |
| PulseArticlesPage | `/pulse/articles` | Missing header |
| PulseGalleryPage | `/pulse/gallery` | Missing header |

Users navigating to these filtered feeds have no visible path to the profile builder module.

---

## Solution

Add the `PersonalizedFeedHeader` component to all 5 individual feed pages, using the exact same logic as the main feed:

- **Profile Incomplete:** Show "Build Profile" button → navigates to `/dashboard`
- **Profile Complete:** Show "View Profile" button → navigates to `/pulse/profile`

---

## Technical Implementation

For each of the 5 pages, the changes are identical:

### 1. Add Imports

```tsx
import { useIsFirstTimeProvider } from '@/hooks/useIsFirstTimeProvider';
import { PersonalizedFeedHeader } from '@/components/pulse/gamification';
```

### 2. Add Hook Call (after existing hooks)

```tsx
const { isFirstTime, provider } = useIsFirstTimeProvider();
```

### 3. Calculate Profile Progress

```tsx
const providerName = provider 
  ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'there'
  : 'there';
const profileProgress = provider?.profile_completion_percentage ?? 0;
const isProfileComplete = profileProgress >= 100;
```

### 4. Add PersonalizedFeedHeader (inside main content div, before page header)

```tsx
{/* Personalized Header with Build/View Profile button */}
{!isFirstTime && provider && (
  <PersonalizedFeedHeader
    providerId={provider.id}
    providerName={providerName}
    profileProgress={profileProgress}
    isProfileComplete={isProfileComplete}
  />
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/pulse/PulseReelsPage.tsx` | Add imports, hooks, and PersonalizedFeedHeader |
| `src/pages/pulse/PulsePodcastsPage.tsx` | Add imports, hooks, and PersonalizedFeedHeader |
| `src/pages/pulse/PulseSparksPage.tsx` | Add imports, hooks, and PersonalizedFeedHeader |
| `src/pages/pulse/PulseArticlesPage.tsx` | Add imports, hooks, and PersonalizedFeedHeader |
| `src/pages/pulse/PulseGalleryPage.tsx` | Add imports, hooks, and PersonalizedFeedHeader |

---

## Layout Position

The `PersonalizedFeedHeader` will appear at the top of the content area, before the existing page-specific header (title, description, share button):

```text
┌─────────────────────────────────────────────────────────┐
│ [PulseQuickNav - tabs for Feed, Reels, etc.]            │
├─────────────────────────────────────────────────────────┤
│ [Avatar] Good morning, John! ✨     [Build Profile →]   │  ← NEW
│   L2     Ready to dominate Healthcare?                   │
│          [Lv 2] [1,500 XP] [3 day streak]               │
├─────────────────────────────────────────────────────────┤
│ 🎬 Reels                                    [Refresh]   │  ← Existing
│ Short-form video content                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │              Share a Reel                            │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                     [Content list...]                    │
└─────────────────────────────────────────────────────────┘
```

---

## Expected Outcome

1. **Consistent UX:** All 5 individual feed pages now show the same personalized header as the main feed
2. **Discoverability:** Users always have a clear path to profile builder regardless of which feed they're viewing
3. **Same Rules:** Button logic matches exactly: incomplete → "Build Profile" to `/dashboard`, complete → "View Profile" to `/pulse/profile`
