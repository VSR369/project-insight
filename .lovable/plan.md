

# Stale Section Filter for Curation Review Page

## What This Does
Adds a "Show Only Stale" toggle filter to the curation review page so curators can quickly find and address stale sections without scrolling through all 26 sections across 6 tabs.

## Changes

### 1. Add `showOnlyStale` state and stale-per-group counts
**File:** `src/pages/cogniblend/CurationReviewPage.tsx`

- Add `const [showOnlyStale, setShowOnlyStale] = useState(false);` (near line 1201 with other state)
- Compute `staleCountByGroup` — a map of group ID → count of stale sections in that group (derived from `staleKeySet` and `GROUPS`)

### 2. Stale indicator badges on progress strip tabs
In the progress strip (line ~2911), add an amber badge showing stale count per group when > 0. This tells the curator which tabs have stale sections at a glance.

### 3. Filter toggle in the group card header
In the active group card header (line ~2954), add a toggle button:
```
[⚠ Show Only Stale (3)] / [Show All Sections]
```
- Only visible when `staleSections.length > 0`
- Toggles `showOnlyStale` state
- Uses amber styling when active

### 4. Filter the rendered sections
In the section rendering loop (line ~2981), wrap with the stale filter:
```typescript
{activeGroupDef.sectionKeys
  .filter(sectionKey => !showOnlyStale || staleKeySet.has(sectionKey))
  .map((sectionKey) => { ... })}
```
When `showOnlyStale` is true, only stale sections in the current tab render.

### 5. Clickable stale list in right rail navigates + enables filter
In the existing stale sections list in the right rail (line ~3927), update the click handler to also enable the stale filter:
```typescript
onClick={() => {
  setShowOnlyStale(true);
  const group = GROUPS.find(g => g.sectionKeys.includes(s.key));
  if (group) setActiveGroup(group.id);
}}
```

### 6. Auto-disable filter when no stale sections remain
Add a `useEffect` that clears `showOnlyStale` when `staleSections.length === 0`.

### 7. Empty state when filter active but no stale in current tab
When `showOnlyStale` is on but the current group has no stale sections, show a message: "No stale sections in this tab" with a button to show all.

## Technical Details
- Single file change: `src/pages/cogniblend/CurationReviewPage.tsx`
- No new components needed — uses existing Badge, Button primitives
- State is local (`useState`) — resets on page navigation, which is correct behavior
- Filter persists across tab switches so the user can click through tabs seeing only stale items

