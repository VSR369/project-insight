

# Modified Banner Implementation Plan

## Business Requirement

The banner at the top of the Industry Pulse feed should display **different content** based on profile completion status:

| Profile Status | Banner Content |
|----------------|----------------|
| Incomplete (< 100%) | "Ready to Stand Out?" + "Let's Build Your Profile" + Progress bar |
| Complete (100%) | "Monetizing Collaborative Innovation" + Different CTA |

The banner is **always visible** - it just changes messaging based on completion.

---

## Current State Analysis

### ProfileBuildBanner.tsx (Current)
- Static content: "Ready to Stand Out?" headline
- Static tagline: "Solve Industry Problems and be a Game Changer"
- Button: "Let's Build Your Profile" → navigates to `/welcome`
- Shows progress bar with percentage

### PulseFeedPage.tsx (Current - line 119)
```tsx
{isFirstTime && (
  <ProfileBuildBanner />
)}
```
Only shows for first-time users (no enrollments).

---

## Implementation Plan

### Approach: Add `isProfileComplete` prop to control banner variant

Rather than creating two separate components, enhance the existing `ProfileBuildBanner` to handle both states.

---

### File 1: `src/components/pulse/layout/ProfileBuildBanner.tsx`

**Changes:**

1. Add new prop `isProfileComplete?: boolean`

2. Conditionally render different content based on completion status:

**When Incomplete (isProfileComplete = false):**
```
Headline: "Ready to Stand Out?"
Tagline: "Solve Industry Problems and be a Game Changer"
Button: "Let's Build Your Profile" → /welcome
Shows: Progress bar with percentage
```

**When Complete (isProfileComplete = true):**
```
Headline: "Monetizing Collaborative Innovation"
Tagline: "Your profile is ready - start collaborating!"
Button: "Explore Opportunities" → /pulse/challenges (or relevant page)
Shows: Success badge instead of progress bar
```

3. Updated props interface:
```typescript
interface ProfileBuildBannerProps {
  className?: string;
  profileProgress?: number;
  isProfileComplete?: boolean;  // NEW
}
```

4. Conditional rendering logic:
```tsx
export function ProfileBuildBanner({ 
  className, 
  profileProgress = 0, 
  isProfileComplete = false 
}: ProfileBuildBannerProps) {
  const navigate = useNavigate();

  return (
    <div className={`relative overflow-hidden rounded-xl bg-gradient-to-r ...`}>
      {/* Decorative elements remain the same */}
      
      <div className="relative z-10 space-y-3 sm:space-y-4">
        {/* Header Section - changes based on completion */}
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="flex-shrink-0 h-10 w-10 sm:h-14 sm:w-14 rounded-full bg-white/20 ...">
            {isProfileComplete ? (
              <Trophy className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            ) : (
              <Sparkles className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-lg sm:text-xl tracking-tight">
              {isProfileComplete 
                ? "Monetizing Collaborative Innovation" 
                : "Ready to Stand Out?"}
            </h3>
            <p className="text-white/90 text-xs sm:text-sm mt-0.5 sm:mt-1 font-medium italic">
              {isProfileComplete 
                ? "Your profile is complete - start earning from your expertise"
                : "Solve Industry Problems and be a Game Changer"}
            </p>
          </div>
        </div>

        {/* CTA Section - different content based on completion */}
        {isProfileComplete ? (
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <Button
              onClick={() => navigate('/pulse/challenges')}
              variant="secondary"
              className="... bg-white text-primary ..."
            >
              Explore Challenges
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            {/* Success indicator instead of progress */}
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-3 border border-white/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-emerald-300" />
                <span className="text-white/90 text-sm font-medium">
                  Profile Complete - Ready to Collaborate
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Existing incomplete profile UI with progress bar */
          <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-center">
            <Button onClick={() => navigate('/welcome')} ...>
              Let's Build Your Profile
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
            
            <div className="flex-1 bg-white/10 ...">
              <Progress value={profileProgress} ... />
              <button onClick={() => navigate('/welcome')} ...>
                Complete Profile
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

5. New imports needed:
```tsx
import { Sparkles, ArrowRight, ChevronRight, Trophy, CheckCircle } from 'lucide-react';
```

---

### File 2: `src/pages/pulse/PulseFeedPage.tsx`

**Changes:**

1. Calculate profile completion status:
```tsx
const profileProgress = provider?.profile_completion_percentage ?? 0;
const isProfileComplete = profileProgress >= 100;
```

2. Always show banner (remove `isFirstTime` condition):
```tsx
{/* Profile Banner - always visible, content changes based on completion */}
{provider && (
  <div className="px-2 sm:px-4 py-3 sm:py-4 border-b">
    <ProfileBuildBanner 
      profileProgress={profileProgress}
      isProfileComplete={isProfileComplete}
    />
  </div>
)}
```

**Note:** Changed from `isFirstTime` to `provider` - banner shows for any logged-in provider.

---

## Visual Summary

```
┌─────────────────────────────────────────────────────────────────┐
│  INCOMPLETE PROFILE (< 100%)                                     │
├─────────────────────────────────────────────────────────────────┤
│  ⭐ Ready to Stand Out?                                         │
│     Solve Industry Problems and be a Game Changer               │
│                                                                  │
│  [Let's Build Your Profile →]  │ Profile Completion [45%]       │
│                                 │ ████████░░░░░░░░░░░            │
│                                 │ Complete Profile >             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  COMPLETE PROFILE (100%)                                         │
├─────────────────────────────────────────────────────────────────┤
│  🏆 Monetizing Collaborative Innovation                          │
│     Your profile is complete - start earning from your expertise │
│                                                                  │
│  [Explore Challenges →]  │ ✓ Profile Complete - Ready to        │
│                          │   Collaborate                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/layout/ProfileBuildBanner.tsx` | Add `isProfileComplete` prop, conditional content rendering |
| `src/pages/pulse/PulseFeedPage.tsx` | Calculate completion status, always show banner for providers |

---

## Technical Notes

1. **Gradient stays the same** - Both states use the same attractive gradient background
2. **Icon changes** - Sparkles (incomplete) vs Trophy (complete)
3. **CTA changes** - "Build Profile" vs "Explore Challenges"
4. **Progress bar** - Hidden when complete, replaced with success message
5. **No new components** - Enhances existing component for maintainability

---

## Verification Checklist

After implementation:
- [ ] Provider with 0-99% profile sees "Ready to Stand Out?" banner
- [ ] Provider with 100% profile sees "Monetizing Collaborative Innovation" banner
- [ ] "Let's Build Your Profile" navigates to `/welcome`
- [ ] "Explore Challenges" navigates to appropriate page
- [ ] Progress bar shows accurate percentage for incomplete profiles
- [ ] Success badge shows for complete profiles
- [ ] Banner displays correctly on mobile and desktop
- [ ] No regression in existing functionality

