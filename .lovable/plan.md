

# Add Profile Builder Navigation to PersonalizedFeedHeader

## Problem Statement

The `PersonalizedFeedHeader` component (visible to returning users) lacks a navigation option to the profile builder module. Users can see the `ProfileBuildBanner` above, but the personalized header area doesn't have a corresponding action button with the same logic.

## Requirement

Apply the **exact same rules** from `ProfileBuildBanner`:
- **Profile Incomplete (<100%):** Show "Let's Build Your Profile" button → navigates to `/dashboard`
- **Profile Complete (100%):** Show "View Profile" button → navigates to `/pulse/profile`

---

## Solution Overview

Modify `PersonalizedFeedHeader` to:
1. Accept `profileProgress` and `isProfileComplete` as props
2. Add a compact action button with conditional text/navigation
3. Update the parent `PulseFeedPage` to pass these props

---

## Technical Details

### File 1: `src/components/pulse/gamification/PersonalizedFeedHeader.tsx`

**Changes:**
1. Add new props: `profileProgress?: number` and `isProfileComplete?: boolean`
2. Import `useNavigate` from react-router-dom
3. Import `Button` component
4. Import `ArrowRight`, `Eye`, `ChevronRight` icons
5. Add conditional button in the header layout

**Button Logic (matching ProfileBuildBanner):**

| State | Button Text | Icon | Destination |
|-------|------------|------|-------------|
| Incomplete | "Build Profile" (mobile: icon only) | ArrowRight | `/dashboard` |
| Complete | "View Profile" (mobile: icon only) | Eye | `/pulse/profile` |

**Layout Position:** Button placed to the right of the greeting section, aligned with the avatar row.

```text
┌─────────────────────────────────────────────────────────────┐
│ Friday, February 7                                           │
├─────────────────────────────────────────────────────────────┤
│ [Avatar] Good morning, John! ✨        [Build Profile →]    │
│   L2     Ready to dominate Healthcare?                       │
│          ┌─────┐ ┌───────┐ ┌──────────┐                     │
│          │Lv 2 │ │1,500XP│ │3 day stk │                     │
│          └─────┘ └───────┘ └──────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

---

### File 2: `src/pages/pulse/PulseFeedPage.tsx`

**Changes:**
Pass the existing `profileProgress` and `isProfileComplete` variables to `PersonalizedFeedHeader`:

```tsx
<PersonalizedFeedHeader
  providerId={provider.id}
  providerName={providerName}
  profileProgress={profileProgress}
  isProfileComplete={isProfileComplete}
/>
```

---

## Code Changes Summary

### PersonalizedFeedHeader.tsx - Props Interface

```tsx
interface PersonalizedFeedHeaderProps {
  providerId: string;
  providerName: string;
  providerAvatar?: string | null;
  primaryIndustry?: string | null;
  profileProgress?: number;        // NEW
  isProfileComplete?: boolean;     // NEW
  className?: string;
}
```

### PersonalizedFeedHeader.tsx - Button Component

```tsx
{/* Profile Action Button - same rules as ProfileBuildBanner */}
<Button
  variant="outline"
  size="sm"
  onClick={() => navigate(isProfileComplete ? '/pulse/profile' : '/dashboard')}
  className="flex-shrink-0 h-8 sm:h-9"
>
  {isProfileComplete ? (
    <>
      <Eye className="h-4 w-4" />
      <span className="hidden sm:inline ml-1.5">View Profile</span>
    </>
  ) : (
    <>
      <ArrowRight className="h-4 w-4" />
      <span className="hidden sm:inline ml-1.5">Build Profile</span>
    </>
  )}
</Button>
```

---

## Responsive Behavior

| Screen Size | Button Appearance |
|-------------|-------------------|
| Mobile (< 640px) | Icon only (compact) |
| Tablet+ (≥ 640px) | Icon + text label |

---

## Files to Modify

| File | Action |
|------|--------|
| `src/components/pulse/gamification/PersonalizedFeedHeader.tsx` | Add props and conditional button |
| `src/pages/pulse/PulseFeedPage.tsx` | Pass profileProgress and isProfileComplete props |

---

## Expected Outcome

1. **Consistency:** Same navigation rules as the ProfileBuildBanner
2. **Discoverability:** Users always see a clear path to profile management
3. **Context-Aware:** Button text and destination change based on profile completion status
4. **Mobile-Friendly:** Compact icon-only display on small screens

