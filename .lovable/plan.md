
# Add ProfileBuildBanner and PersonalizedFeedHeader to PulseCardsPage

## Problem Confirmed

The `/pulse/cards` page was **missed** in the previous implementation. It currently:
- Uses `useCurrentProvider()` instead of `useIsFirstTimeProvider()`
- Has NO `ProfileBuildBanner` component
- Has NO `PersonalizedFeedHeader` component
- First-time AND returning users have no visible path to profile builder

## Root Cause

When we updated the 5 individual feed pages (Reels, Sparks, Articles, Podcasts, Gallery), we did not include PulseCardsPage because it's in a different category (collaborative wiki vs content feeds), but it still needs the same navigation pattern.

---

## Solution

Apply the exact same pattern as other individual feed pages:

1. Replace `useCurrentProvider()` with `useIsFirstTimeProvider()` as single source of truth
2. Add `ProfileBuildBanner` (always visible when provider exists)
3. Add `PersonalizedFeedHeader` (visible only for returning users)

---

## Technical Changes

### File: `src/pages/pulse/PulseCardsPage.tsx`

### 1. Update Imports

```tsx
// Remove
import { useCurrentProvider } from '@/hooks/queries/useProvider';

// Add
import { useIsFirstTimeProvider } from '@/hooks/useIsFirstTimeProvider';
import { ProfileBuildBanner } from '@/components/pulse/layout';
import { PersonalizedFeedHeader } from '@/components/pulse/gamification';
```

### 2. Update Hook Usage

```tsx
// Replace
const { data: provider } = useCurrentProvider();

// With
const { 
  isFirstTime, 
  provider, 
  isLoading: providerLoading 
} = useIsFirstTimeProvider();
```

### 3. Add Derived Values

```tsx
const providerName = provider 
  ? `${provider.first_name || ''} ${provider.last_name || ''}`.trim() || 'there'
  : 'there';
const profileProgress = provider?.profile_completion_percentage ?? 0;
const isProfileComplete = profileProgress >= 100;
```

### 4. Add Header Components (inside the flex container, before Topic Filter)

```tsx
<div className="flex flex-col h-full">
  {/* Profile Build Banner - always visible when provider exists */}
  {provider && (
    <div className="px-4 py-3 sm:py-4 border-b">
      <ProfileBuildBanner
        profileProgress={profileProgress}
        isProfileComplete={isProfileComplete}
      />
    </div>
  )}

  {/* Personalized Header - returning users only */}
  {!isFirstTime && provider && (
    <PersonalizedFeedHeader
      providerId={provider.id}
      providerName={providerName}
      profileProgress={profileProgress}
      isProfileComplete={isProfileComplete}
    />
  )}

  {/* Topic Filter - existing code */}
  <div className="px-4 py-3 border-b ...">
    ...
  </div>
  
  ...rest of content
</div>
```

---

## Layout Result

```text
┌─────────────────────────────────────────────────────────┐
│ Ready to Stand Out?               [Build Your Profile]  │  ← ProfileBuildBanner
│ Solve Industry Problems...              [Progress: 45%] │
├─────────────────────────────────────────────────────────┤
│ [Avatar] Good afternoon, John! ✨   [Build Profile →]   │  ← PersonalizedFeedHeader
│   L2     Ready to dominate Healthcare?                   │     (returning users only)
│          [Lv 2] [1,500 XP] [3 day streak]               │
├─────────────────────────────────────────────────────────┤
│ 🔍 [All Topics ▼]                          [+ New Card] │  ← Existing Topic Filter
├─────────────────────────────────────────────────────────┤
│                   [Card Stack Content]                   │
└─────────────────────────────────────────────────────────┘
```

---

## Expected Outcome

| User Type | What They See |
|-----------|---------------|
| First-time (no enrollments) | ProfileBuildBanner with "Build Profile" CTA |
| Returning (has enrollments, incomplete profile) | Both banner AND personalized header with "Build Profile" |
| Returning (complete profile) | Both banner AND header with "View Profile" |

This ensures the Pulse Cards page follows the exact same rules as main feed and all other individual content pages.
