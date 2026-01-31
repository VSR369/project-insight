# Plan: First-Time Solution Provider Onboarding Flow

## Status: ✅ IMPLEMENTED

## Overview
Redesigned the first-time Solution Provider experience to show Industry Pulse as the landing screen with a prominent CTA to build their profile, instead of the current Dashboard landing.

---

## Implementation Summary

### Files Created
| File | Purpose | Status |
|------|---------|--------|
| `src/hooks/useIsFirstTimeProvider.ts` | Detection hook for first-time status | ✅ |
| `src/components/pulse/layout/ProfileBuildBanner.tsx` | CTA banner for building profile | ✅ |
| `src/components/pulse/layout/PulseLayoutFirstTime.tsx` | Layout without bottom nav for first-time users | ✅ |
| `src/components/pulse/layout/PulseHeaderFirstTime.tsx` | Simplified header with Build Profile CTA | ✅ |
| `src/pages/pulse/PulseGetStartedPage.tsx` | Onboarding motivation page | ✅ |

### Files Modified
| File | Changes | Status |
|------|---------|--------|
| `src/pages/Login.tsx` | Redirect first-time providers to `/pulse/feed` | ✅ |
| `src/components/routing/RoleBasedRedirect.tsx` | First-time redirect to `/pulse/feed` | ✅ |
| `src/pages/pulse/PulseFeedPage.tsx` | Conditional layout + ProfileBuildBanner | ✅ |
| `src/components/pulse/layout/index.ts` | Export new components | ✅ |
| `src/pages/pulse/index.ts` | Export new page | ✅ |
| `src/App.tsx` | Add `/pulse/get-started` route | ✅ |

---

## New User Journey

```text
Step 1: User registers as Solution Provider
        → After login, redirect to /pulse/feed

Step 2: User lands on Industry Pulse (First-Time Layout)
        - Sees feed with all provider posts
        - NO bottom navigation bar
        - Simplified header with "Build Profile" button
        - Prominent ProfileBuildBanner at top of feed
        - Can scroll, view, react to posts
        
Step 3: User clicks "Build Profile" or banner CTA
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

## Route Summary

| Route | User Type | Layout | Purpose |
|-------|-----------|--------|---------|
| `/pulse/feed` | First-time | PulseLayoutFirstTime | Feed with CTA banner |
| `/pulse/feed` | Returning | PulseLayout | Normal feed |
| `/pulse/get-started` | First-time | Standalone | Motivational onboarding |
| `/welcome` | All | Standalone | Current welcome (entry to wizard) |
| `/enroll/*` | All | WizardLayout | Enrollment wizard steps |

