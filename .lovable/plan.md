

# Fix Organization Tab: Persistent Data & Expandable Description

## Problems Identified

1. **Data lost on tab switch**: Local state (`useState`) is seeded inside `queryFn`. When you switch tabs and come back, the component remounts but React Query serves cached data without re-executing `queryFn` (due to 5-min `staleTime`). The `useState` setters never fire → fields show empty strings.

2. **Description textarea not expandable**: The `Textarea` has `resize-none` and fixed `rows={3}`, making it hard to write/edit longer content.

## Changes

### File: `src/components/cogniblend/curation/OrgContextPanel.tsx`

**1. Fix persistence — sync state from query data via `useEffect`**

Remove the `setState` calls from inside `queryFn` (lines 116-121). Instead, add a `useEffect` that watches `orgData` and seeds local state whenever it changes. This fires on every mount — whether from fresh fetch or cache hit.

```tsx
useEffect(() => {
  if (orgData) {
    setWebsiteUrl(orgData.website_url ?? '');
    setLinkedinUrl(orgData.linkedin_url ?? '');
    setTwitterUrl(orgData.twitter_url ?? '');
    setDescription(orgData.organization_description ?? '');
    setTagline(orgData.tagline ?? '');
    setIsDirty(false);
  }
}, [orgData]);
```

**2. Auto-save with debounce (800ms)**

Add a `useEffect` with an 800ms debounce timer that auto-saves dirty fields to `seeker_organizations`. This ensures data persists even if the user switches tabs without clicking Save. The explicit Save button remains as a visual confirmation option.

**3. Make description textarea expandable**

- Remove `resize-none` class
- Add `resize-y` class for vertical resizing
- Increase default `rows` from 3 to 4
- Add `min-h-[80px]` so it doesn't shrink too small

### No database or schema changes needed

Data already saves to `seeker_organizations` — the issue is purely a client-side state hydration bug.

## Technical Detail

- The root cause is React Query's cache behavior: `queryFn` only runs on cache miss or stale refetch, but `staleTime` is 5 minutes. The `useState` initializers default to `''`, so on remount with cached data, fields appear empty.
- Auto-save debounce uses `useRef` for the timer, flushing on unmount to catch tab switches.
- The `isDirty` flag prevents unnecessary saves on initial hydration.

