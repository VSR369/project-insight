

## Navigation Improvement Plan for Industry Pulse Module

### Current Issues Identified

1. **No way to return to main dashboard** from any Pulse page (feed, sparks, cards, reels, etc.)
2. **Detail pages navigate incorrectly** - Pulse Card detail goes to `/pulse/cards` as fallback, but content detail pages don't have proper fallback routing
3. **Bottom navigation is self-contained** - no exit point to the main application

### Proposed Solution

#### 1. Add Dashboard Exit Button to PulseHeader

Add a persistent "Dashboard" or "Exit" icon in the header for all Pulse pages:

```text
┌─────────────────────────────────────────────┐
│ [←Back] [🏠Dashboard]   Pulse    [🔍] [🔔]  │
└─────────────────────────────────────────────┘
```

**Technical approach:**
- Add a `LayoutDashboard` or `Home` icon to the left section of `PulseHeader.tsx`
- Always visible, navigates to `/dashboard`
- Position: Left side, before the title/logo

#### 2. Smart Context-Aware Back Navigation

Enhance `PulseHeader.tsx` with a new optional `parentRoute` prop for intelligent fallback:

| Current Page | Parent Route |
|--------------|--------------|
| `/pulse/content/:id` (any content) | Based on content type |
| `/pulse/cards/:cardId` | `/pulse/cards` |
| `/pulse/profile/:providerId` | `/pulse/feed` |

**Technical approach:**
- Add `parentRoute?: string` prop to `PulseHeader`
- Update fallback logic: `navigate(parentRoute || '/pulse/feed')`

#### 3. Update Detail Page Layouts

Modify each detail page to pass appropriate `parentRoute`:

| File | Change |
|------|--------|
| `PulseCardDetailPage.tsx` | Add `parentRoute="/pulse/cards"` |
| `PulseContentDetailPage.tsx` | Add dynamic `parentRoute` based on content type |
| `PulsePublicProfilePage.tsx` | Add `parentRoute="/pulse/feed"` |

#### 4. Files to Modify

| File | Changes |
|------|---------|
| `src/components/pulse/layout/PulseHeader.tsx` | Add dashboard button, add `parentRoute` prop, update back logic |
| `src/pages/pulse/PulseCardDetailPage.tsx` | Pass `parentRoute="/pulse/cards"` |
| `src/pages/pulse/PulseContentDetailPage.tsx` | Pass dynamic `parentRoute` |
| `src/pages/pulse/PulsePublicProfilePage.tsx` | Pass `parentRoute="/pulse/feed"` |

### Visual Design

**Updated Header Layout:**
```text
┌─────────────────────────────────────────────────────────┐
│ [Grid Icon]  [← Back]  Title        [Search] [Bell]    │
│    ↓             ↓                                      │
│  Dashboard   Go Back                                    │
│  (always)    (contextual)                               │
└─────────────────────────────────────────────────────────┘
```

- **Grid/Dashboard icon**: Always visible on all Pulse pages, exits to `/dashboard`
- **Back arrow**: Only shown when `showBackButton={true}`, goes to parent route or browser history

### Technical Details

**Updated PulseHeader interface:**
```typescript
interface PulseHeaderProps {
  title?: string;
  showBackButton?: boolean;
  parentRoute?: string;  // NEW: Fallback route for back button
}
```

**Back button logic update:**
```typescript
onClick={() => {
  if (window.history.length > 2) {
    navigate(-1);
  } else {
    navigate(parentRoute || '/pulse/feed');
  }
}}
```

### Is This Design Okay?

Yes, this design follows standard mobile app patterns:

1. **Consistent exit point** - Users can always return to the main dashboard
2. **Context-aware back** - Back button goes to logical parent (Spark detail → Sparks list)
3. **No dead ends** - Every page has a clear navigation path
4. **Familiar UX** - Similar to Instagram/TikTok where tapping the logo returns to home

