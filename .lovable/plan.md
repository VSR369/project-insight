
# Plan: First-Time Solution Provider Onboarding Flow

## Overview
Redesign the first-time Solution Provider experience to show Industry Pulse as the landing screen with a prominent CTA to build their profile, instead of the current Dashboard landing.

---

## Current Flow vs. New Flow

### Current Flow:
```
Register → Login → /dashboard (with "Add Your First Industry" CTA)
                      ↓
              Add Industry Dialog → /enroll/registration → wizard steps
```

### New Flow (Requested):
```
Register → Login → /pulse/feed (Industry Pulse - NO sidebar)
                      ↓
           "Let's Build Your Profile" Banner/Button
                      ↓
           New Onboarding Page (image design - motivational)
                      ↓
           "Let's Build Your Profile" Button → /welcome
                      ↓
           Current Welcome page → /enroll/participation-mode
```

---

## Implementation Phases

### Phase 1: Routing Changes

**1.1 Update Login.tsx redirection:**
- For first-time providers (no enrollments): Redirect to `/pulse/feed` instead of `/dashboard`
- Detect first-time status via:
  - Provider exists but has 0 enrollments, OR
  - No provider record exists (brand new signup)

**1.2 Update RoleBasedRedirect.tsx:**
- Same logic: first-time providers go to `/pulse/feed`

**1.3 Update Register.tsx post-signup:**
- New signups redirect to `/pulse/feed`

---

### Phase 2: Create First-Time Pulse Layout

**2.1 Create `PulseLayoutFirstTime.tsx`:**
- Identical to `PulseLayout` BUT:
  - No sidebar
  - No bottom navigation (or simplified navigation)
  - Shows prominent "Let's Build Your Profile" banner at top
- This layout is conditionally used when user has no enrollments

**2.2 Update `PulseFeedPage.tsx`:**
- Detect if user is first-time (no enrollments)
- If first-time: show `PulseLayoutFirstTime` with profile CTA banner
- If returning user: show normal `PulseLayout`
- First-time users can still:
  - View all posts
  - React/engage with posts (following existing rules)
  - Create posts (if allowed by reputation tier)

---

### Phase 3: Create Profile Build Onboarding Page

**3.1 Create `/pulse/get-started` page:**
- Based on the provided image design
- Content structure:
  ```
  [Hero Section]
  "Lead the way in digital age innovation"
  "You're not just joining a platform — You're entering a movement."
  Movement description text
  
  [Why Your Profile Matters Section]
  - Complex High-Revenue Challenges (icon + text)
  - Increased Visibility (icon + text)  
  - Priority Shortlisting (icon + text)
  - Challenge Readiness Badges (icon + text)
  
  [Verified Providers Section]
  Same 4 benefits with checkmarks
  
  [CTA Button]
  "Let's Build Your Profile" → navigates to /welcome
  ```

**3.2 Add route in App.tsx:**
```tsx
<Route
  path="/pulse/get-started"
  element={
    <AuthGuard>
      <PulseGetStartedPage />
    </AuthGuard>
  }
/>
```

---

### Phase 4: Update Existing Components

**4.1 Create `ProfileBuildBanner.tsx`:**
- Sticky/prominent banner for first-time users on Pulse Feed
- Design: Gradient background, icon, text, and CTA button
- Text: "Ready to stand out? Let's build your profile!"
- Button: "Let's Build Your Profile" → `/pulse/get-started`

**4.2 Update `PulseHeader.tsx`:**
- For first-time users: show "Build Profile" button instead of dashboard exit
- Or add as secondary action

**4.3 Update `PulseBottomNav.tsx` for first-time users:**
- Option A: Hide completely for first-time users
- Option B: Show but with "Profile" replaced by "Build Profile" CTA
- Recommendation: Option A (hide nav) to focus attention on CTA

---

### Phase 5: First-Time User Detection Hook

**5.1 Create `useIsFirstTimeProvider.ts` hook:**
```typescript
export function useIsFirstTimeProvider() {
  const { data: provider, isLoading: providerLoading } = useCurrentProvider();
  const { data: enrollments, isLoading: enrollmentsLoading } = useProviderEnrollments(provider?.id);
  
  const isFirstTime = !providerLoading && !enrollmentsLoading && 
    (!provider || !enrollments || enrollments.length === 0);
  
  return {
    isFirstTime,
    isLoading: providerLoading || enrollmentsLoading,
    provider,
    enrollments,
  };
}
```

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/pages/pulse/PulseGetStartedPage.tsx` | Onboarding motivation page (image design) |
| `src/components/pulse/layout/PulseLayoutFirstTime.tsx` | Layout without nav for first-time users |
| `src/components/pulse/layout/ProfileBuildBanner.tsx` | CTA banner for building profile |
| `src/hooks/useIsFirstTimeProvider.ts` | Detection hook for first-time status |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Login.tsx` | Redirect first-time providers to `/pulse/feed` |
| `src/pages/Register.tsx` | Redirect new signups to `/pulse/feed` |
| `src/components/routing/RoleBasedRedirect.tsx` | First-time redirect to `/pulse/feed` |
| `src/pages/pulse/PulseFeedPage.tsx` | Use conditional layout, show ProfileBuildBanner |
| `src/components/pulse/layout/PulseBottomNav.tsx` | Hide for first-time users |
| `src/components/pulse/layout/PulseHeader.tsx` | Show "Build Profile" for first-time users |
| `src/components/pulse/layout/index.ts` | Export new components |
| `src/pages/pulse/index.ts` | Export new page |
| `src/App.tsx` | Add `/pulse/get-started` route |

---

## User Journey After Implementation

```text
Step 1: User registers as Solution Provider
        → Redirect to /pulse/feed

Step 2: User lands on Industry Pulse
        - Sees feed with all provider posts
        - NO sidebar navigation
        - Prominent "Let's Build Your Profile" banner at top
        - Can scroll, view, react to posts
        
Step 3: User clicks "Let's Build Your Profile"
        → Navigates to /pulse/get-started

Step 4: User sees motivational onboarding page
        - "Lead the way in digital age innovation"
        - Why Your Profile Matters cards
        - Verified providers benefits
        - "Let's Build Your Profile" CTA button

Step 5: User clicks CTA
        → Navigates to /welcome (existing Welcome page)

Step 6: User clicks "Let's Build Your Profile" on Welcome
        → Starts enrollment wizard at /enroll/participation-mode
```

---

## Key Design Decisions

1. **First-time detection**: Based on enrollment count = 0, not lifecycle status
2. **Pulse access**: First-time users CAN access Pulse and interact with content
3. **Layout simplification**: No bottom nav = focus on CTA
4. **Two-step motivation**: Banner → GetStarted page → Welcome → Wizard
5. **Non-blocking**: Users can explore Pulse before building profile

---

## Technical Considerations

- **Performance**: Hook combines provider + enrollments queries (already cached)
- **State persistence**: No sessionStorage needed - computed on each load
- **Progressive disclosure**: Show features incrementally as user progresses
- **Mobile-first**: PulseLayout is already mobile-first, continue that pattern

---

## Route Summary

| Route | User Type | Layout | Purpose |
|-------|-----------|--------|---------|
| `/pulse/feed` | First-time | PulseLayoutFirstTime | Feed with CTA banner |
| `/pulse/feed` | Returning | PulseLayout | Normal feed |
| `/pulse/get-started` | First-time | Standalone | Motivational onboarding |
| `/welcome` | All | Standalone | Current welcome (entry to wizard) |
| `/enroll/*` | All | WizardLayout | Enrollment wizard steps |

