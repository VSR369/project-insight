
# Fix: Back Navigation Arrow Not Working on "Create > New Reel" Page

## Problem

The back arrow button in the header doesn't work when viewing the Reel Creator (or any content creator). Clicking it has no visible effect.

## Root Cause

The `PulseCreatePage` uses **internal state** (`showForm`) to switch between two views at the **same URL** (`/pulse/create`):
- View 1: Content type selection grid (`showForm = false`)
- View 2: Creator form (e.g., ReelCreator) (`showForm = true`)

When the user clicks the header's back arrow:
1. `handleBackClick()` in `PulseHeader.tsx` calls `navigate('/pulse/create')`
2. React Router sees we're already at `/pulse/create`
3. **Navigation is a no-op** - React Router doesn't re-render for same-URL navigation
4. The `showForm` state remains `true`, so the creator form stays visible

## Solution

Update `PulseCreatePage` to pass a callback function to the `PulseLayout` that resets the internal state when the back button is clicked, instead of relying on URL navigation.

**Alternative approach (recommended):** Use the `parentPath` with state or a query parameter to signal the page should reset. However, the cleanest solution is to:

1. Navigate to `/pulse/create` with a `replace: true` option and **state** that triggers a reset
2. OR detect if we're already at the target URL and call the cancel handler directly

**Simplest fix:** Modify the breadcrumb's `parentPath` to include a query parameter like `?reset=true`, then handle that in `PulseCreatePage` to reset state.

However, an even **cleaner architectural fix** is to use React Router's navigation state:

### Implementation

**File: `src/pages/pulse/PulseCreatePage.tsx`**

Add effect to check for reset signal:

```typescript
// After the existing hooks, add:
useEffect(() => {
  // If navigating back to this page, reset to selection view
  if (location.state?.reset && showForm) {
    setShowForm(false);
    setSelectedType(null);
    // Clear the state to prevent re-triggering
    navigate('/pulse/create', { replace: true, state: {} });
  }
}, [location.state]);
```

And update the breadcrumb to pass reset state:

```typescript
// Change the breadcrumb config
<PulseLayout 
  breadcrumb={{
    parentLabel: 'Create',
    parentPath: '/pulse/create',
    currentLabel: `New ${selectedTypeInfo?.name || 'Content'}`,
  }}
  onBackClick={handleBack}  // NEW: Add callback prop
>
```

**However**, adding a new prop to `PulseLayout` requires changes to multiple components.

### Recommended Solution: Simpler Approach

The simplest fix is to **modify the back handler in `PulseHeader.tsx`** to handle same-URL navigation by going to browser history instead:

**File: `src/components/pulse/layout/PulseHeader.tsx`**

Update `handleBackClick`:

```typescript
const handleBackClick = () => {
  // Get current path for comparison
  const currentPath = window.location.pathname;
  
  if (breadcrumb?.parentPath) {
    // If we're already at the parent path, use history back instead
    // This handles the case where PulseCreatePage uses internal state
    if (currentPath === breadcrumb.parentPath) {
      if (window.history.length > 2) {
        navigate(-1);
      } else {
        navigate('/pulse/feed');
      }
    } else {
      navigate(breadcrumb.parentPath);
    }
  } else if (parentRoute) {
    navigate(parentRoute);
  } else if (window.history.length > 2) {
    navigate(-1);
  } else {
    navigate('/pulse/feed');
  }
};
```

**BUT** this doesn't actually solve the problem - if the user came directly to `/pulse/create` and selected a type, `navigate(-1)` would exit Pulse entirely.

### Best Solution: Use Navigation State

**File 1: `src/components/pulse/layout/PulseHeader.tsx`**

Update the navigation to pass state:

```typescript
const handleBackClick = () => {
  if (breadcrumb?.parentPath) {
    // Pass state to signal the page should reset to its initial view
    navigate(breadcrumb.parentPath, { state: { fromBackButton: true } });
  } else if (parentRoute) {
    navigate(parentRoute);
  } else if (window.history.length > 2) {
    navigate(-1);
  } else {
    navigate('/pulse/feed');
  }
};
```

**File 2: `src/pages/pulse/PulseCreatePage.tsx`**

Handle the back button state:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// ... other imports

export default function PulseCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselectedType = (location.state as { type?: string })?.type;
  const fromBackButton = (location.state as { fromBackButton?: boolean })?.fromBackButton;
  
  const [selectedType, setSelectedType] = useState<string | null>(preselectedType || null);
  const [showForm, setShowForm] = useState(!!preselectedType);

  // Reset view when back button was clicked
  useEffect(() => {
    if (fromBackButton && showForm) {
      setShowForm(false);
      setSelectedType(null);
      // Clear the navigation state
      navigate('/pulse/create', { replace: true });
    }
  }, [fromBackButton, showForm, navigate]);

  // ... rest of component
```

## Files to Modify

| File | Change |
|------|--------|
| `src/components/pulse/layout/PulseHeader.tsx` | Pass `{ state: { fromBackButton: true } }` when navigating to parent |
| `src/pages/pulse/PulseCreatePage.tsx` | Add useEffect to detect back button navigation and reset state |

## Verification

After implementation:
1. Navigate to `/pulse/create`
2. Select "Reel" and click Continue
3. Verify breadcrumb shows "Create > New Reel"
4. Click the back arrow in the header
5. Should return to content type selection (not stay on ReelCreator)
6. Also test Cancel button in form - should still work
7. Test other creator types (Article, Spark, etc.)
