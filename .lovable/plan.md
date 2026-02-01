
# Fix: Back Arrow Should Navigate to Feed, Not Create Selection

## Problem Understanding

When a user is on a content creator form (e.g., "Create > New Reel"), clicking the back arrow currently navigates to `/pulse/create` (the content type selection grid). The user wants it to go directly to `/pulse/feed` (the main feed).

## Current Flow

```text
/pulse/feed → /pulse/create (selection grid) → /pulse/create (creator form)
                                                         │
                                                    Back Arrow
                                                         │
                                                         ↓
                                              /pulse/create (selection grid)  ← CURRENT
```

## Desired Flow

```text
/pulse/feed → /pulse/create (selection grid) → /pulse/create (creator form)
                                                         │
                                                    Back Arrow
                                                         │
                                                         ↓
                                                   /pulse/feed  ← DESIRED
```

## Root Cause

In `PulseCreatePage.tsx` (lines 127-132), the breadcrumb is configured with:
```typescript
breadcrumb={{
  parentLabel: 'Create',
  parentPath: '/pulse/create',  // ← Points to Create, not Feed
  currentLabel: `New ${selectedTypeInfo?.name || 'Content'}`,
}}
```

## Solution

Change the breadcrumb configuration to point to `/pulse/feed` instead of `/pulse/create`:

**File: `src/pages/pulse/PulseCreatePage.tsx`**

Lines 128-130 - Update the breadcrumb to navigate to Feed:

```typescript
breadcrumb={{
  parentLabel: 'Feed',           // Changed from 'Create'
  parentPath: '/pulse/feed',     // Changed from '/pulse/create'
  currentLabel: `New ${selectedTypeInfo?.name || 'Content'}`,
}}
```

## Impact Analysis

| Aspect | Impact |
|--------|--------|
| Create selection page | No change - still uses `isPrimaryPage` with Dashboard icon |
| Creator forms (Reel, Post, etc.) | Back arrow now goes to Feed |
| Cancel button in forms | Still calls `onCancel={handleBack}` which resets to selection grid |
| Other navigation | Not affected |

## User Experience After Fix

1. User navigates to Create page from Feed
2. User selects "Reel" and clicks Continue
3. Header shows "Feed > New Reel" breadcrumb
4. Clicking back arrow → Goes to `/pulse/feed`
5. Clicking Cancel button → Goes back to content type selection (unchanged)

## Alternative Consideration

The user may still want access to the content type selection from the creator. This is preserved via:
- The Cancel button which resets to selection grid
- The PulseQuickNav (on desktop) which has direct access
- The bottom nav (on mobile) which has the Create button

## File to Modify

| File | Change |
|------|--------|
| `src/pages/pulse/PulseCreatePage.tsx` | Lines 128-130: Change `parentLabel` to 'Feed' and `parentPath` to '/pulse/feed' |

## Cleanup

The previous fix that added `fromBackButton` state handling (lines 87-95) can now be removed since we're no longer navigating to the same URL. However, keeping it doesn't cause any harm and provides robustness for edge cases.
