

# Fix Plan: Card-Level Read/Contributors Toggle for Pulse Cards

## Understanding the Requirement

**Current behavior:** `/pulse/cards` shows a card stack where each card is a simple preview linking to `/pulse/cards/:cardId` for the detail view with Read/Contributors tabs.

**Required behavior:** `/pulse/cards` shows a **list of cards** where **each card has its own Read/Contributors toggle inline**. Users can expand any card to see either the AI-synthesized narrative (Read) or individual contributions (Contributors) without navigating away.

## Architecture

```text
PulseCardsPage
├── Header (topic filter, New Card button)
└── Card List (scrollable)
    ├── PulseCardListItem #1
    │   ├── Card Header (topic badge, stats)
    │   ├── ViewModeToggle (Read | Contributors)  ← CARD-LEVEL
    │   ├── CompiledView OR ContributorsView      ← Based on toggle
    │   └── Actions (Improve, Flag)
    ├── PulseCardListItem #2
    │   ├── ViewModeToggle (Read | Contributors)  ← EACH CARD HAS ITS OWN
    │   ├── CompiledView OR ContributorsView
    │   └── Actions
    └── ... more cards
```

## Root Cause of Current Issue

| Why | Finding |
|-----|---------|
| **Why 1** | Read/Contributors toggle not visible on `/pulse/cards` list |
| **Why 2** | Current `PulseCard.tsx` shows only a quote/preview, not the dual-view |
| **Why 3** | Dual-view (Read/Contributors) only exists in `PulseCardDetailPage.tsx` |
| **Why 4** | Architecture treats list items as previews, not full wiki entries |
| **Why 5** | **Root cause:** Need a new card list item component that embeds the dual-view toggle and content inline |

## Solution

### Approach
Create a new **`PulseCardListItem`** component that renders each card with:
1. Topic header with stats (views, builds, shares)
2. **Card-level** Read/Contributors toggle
3. Full `CompiledView` or `ContributorsView` based on toggle state
4. Actions (Improve this Knowledge, Flag)
5. Each card independently manages its own view mode state

### Technical Changes

#### File 1: NEW `src/components/pulse/cards/PulseCardListItem.tsx`
A new component that wraps a single card with its own view mode toggle:

```tsx
interface PulseCardListItemProps {
  card: PulseCardType;
  providerId?: string;
  reputation?: number;
  canVote: boolean;
  canFlag: boolean;
  canBuild: boolean;
  onImprove: (cardId: string) => void;
  onFlag: (cardId: string) => void;
}

// Component manages its own viewMode state (defaults to 'compiled')
const [viewMode, setViewMode] = useState<ViewMode>('compiled');

// Fetches layers for this specific card
const { data: layers } = usePulseCardLayers(card.id);

// Renders:
// - Topic header with stats
// - ViewModeToggle (controls this card only)
// - CompiledView or ContributorsView based on toggle
// - Improve/Flag actions
```

**Key features:**
- Each card has its own `useState<ViewMode>` - toggling one doesn't affect others
- Uses `usePulseCardLayers(card.id)` to fetch layers for that card
- Uses `useCompileCardNarrative` for Read view compilation
- Inline `CompiledView` and `ContributorsView` - no navigation

#### File 2: UPDATE `src/pages/pulse/PulseCardsPage.tsx`
Replace `PulseCardStack` with a scrollable list of `PulseCardListItem`:

```tsx
// Replace PulseCardStack with:
<ScrollArea className="flex-1">
  <div className="space-y-6 p-4">
    {cards.map((card) => (
      <PulseCardListItem
        key={card.id}
        card={card}
        providerId={provider?.id}
        reputation={reputation?.total || 0}
        canVote={reputation?.canVote ?? false}
        canFlag={reputation?.canFlag ?? false}
        canBuild={reputation?.canBuild ?? false}
        onImprove={handleImprove}
        onFlag={handleFlag}
      />
    ))}
  </div>
</ScrollArea>
```

#### File 3: UPDATE `src/components/pulse/cards/index.ts`
Add export for new component:
```tsx
export { PulseCardListItem } from './PulseCardListItem';
```

## Component Structure (PulseCardListItem)

```text
PulseCardListItem
├── Card Container (border, rounded, shadow)
│   ├── Header Row
│   │   ├── Topic Badge + Stats (views, builds, shares)
│   │   └── Flag Button
│   │
│   ├── ViewModeToggle (Read | Contributors)
│   │   └── Card-level state: viewMode = 'compiled' | 'contributors'
│   │
│   ├── Content Area (animated transition)
│   │   ├── IF viewMode === 'compiled':
│   │   │   └── CompiledView (AI narrative, contributors, "Improve" CTA)
│   │   └── IF viewMode === 'contributors':
│   │       └── ContributorsView (layer cards, voting, "Build" button)
│   │
│   └── Footer (seed creator info)
```

## What Stays the Same (No Changes)
- `ViewModeToggle.tsx` - Reused as-is (just used per-card now)
- `CompiledView.tsx` - Reused as-is
- `ContributorsView.tsx` - Reused as-is
- `PulseCardDetailPage.tsx` - Direct links still work
- `PulseCard.tsx` - Can be deprecated or used elsewhere
- `PulseCardStack.tsx` - Can be deprecated (swipe replaced by scroll list)
- All hooks (usePulseCards, usePulseCardLayers, useCompileCardNarrative, etc.)
- Routing in App.tsx
- PulseLayout, header, QuickNav - all preserved

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `src/components/pulse/cards/PulseCardListItem.tsx` | **CREATE** | New card item with inline Read/Contributors toggle |
| `src/pages/pulse/PulseCardsPage.tsx` | **EDIT** | Use PulseCardListItem list instead of PulseCardStack |
| `src/components/pulse/cards/index.ts` | **EDIT** | Export new component |

## Testing Checklist

After implementation:
- [ ] `/pulse/cards` shows list of cards (not swipe stack)
- [ ] Each card has its own Read/Contributors toggle
- [ ] Toggling one card's view mode doesn't affect other cards
- [ ] Read view shows AI-synthesized narrative with contributors
- [ ] Contributors view shows individual layers with voting
- [ ] "Improve this Knowledge" button opens CreateLayerDialog
- [ ] Topic filter still works
- [ ] "New Card" button still works
- [ ] Direct link `/pulse/cards/:cardId` still works
- [ ] Header and navigation remain fully functional
- [ ] Scrolling works smoothly with multiple cards

## Reference Image Match

Matching your reference screenshot:
- ✅ Topic header with view/build/share stats
- ✅ "Read" tab (AI-synthesized narrative)
- ✅ "Contributors" tab (individual contributions)
- ✅ Contributor avatars with "View build history"
- ✅ "Improve this Knowledge" dashed CTA button
- ✅ Each card is self-contained with its own toggle

