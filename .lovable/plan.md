
# Plan: Pulse Cards Dual-View UX System

## Overview
Transform the Pulse Cards detail page into a modern dual-view wiki system with:
1. **Compiled View (Default)**: AI-synthesized narrative combining all contributions
2. **Contributors View**: Individual contribution cards with voting (current design, refined)

## Current State Analysis

### Existing Components
- `PulseCardDetailPage.tsx` - Detail page showing layers with voting
- `PulseCardLayer.tsx` - Individual layer display with votes
- `CreateLayerDialog.tsx` - "Build on card" modal
- Existing AI edge function pattern in `enhance-pulse-content/`

### Database Schema (No Changes Required)
The existing `pulse_cards` and `pulse_card_layers` tables support this feature:
- `pulse_cards`: id, topic_id, seed_creator_id, current_featured_layer_id, view_count, etc.
- `pulse_card_layers`: id, card_id, creator_id, content_text, votes_up, votes_down, is_featured, etc.

**New fields needed on `pulse_cards`:**
- `compiled_narrative TEXT` - Cached AI-compiled narrative
- `compiled_at TIMESTAMPTZ` - When compilation occurred
- `compilation_stale BOOLEAN DEFAULT false` - Flag when new layer added

## Implementation Architecture

### Phase 1: Database Schema Update

Add compilation cache fields to `pulse_cards` table:

```sql
ALTER TABLE pulse_cards
  ADD COLUMN compiled_narrative TEXT,
  ADD COLUMN compiled_at TIMESTAMPTZ,
  ADD COLUMN compilation_stale BOOLEAN DEFAULT false;
```

Add trigger to mark narrative stale when new layer is added.

### Phase 2: New Components

#### A) ViewModeToggle Component
Pill toggle with "Read" and "Contributors" tabs using Radix Tabs:

```
src/components/pulse/cards/ViewModeToggle.tsx
```

Features:
- Uses existing shadcn Tabs component
- Styled as pill toggle per design spec
- Keyboard accessible

#### B) CompiledView Component
Synthesized narrative display:

```
src/components/pulse/cards/CompiledView.tsx
```

Features:
- Displays cached compiled_narrative
- Contributor avatars in footer (overlapping style)
- "View build history" expandable link
- "Improve this Knowledge" CTA button
- Loading state with spinner during AI compilation
- Fallback to featured layer if AI unavailable

#### C) ContributorsView Component
Refactored layer list (current design enhanced):

```
src/components/pulse/cards/ContributorsView.tsx
```

Features:
- Featured layer at top with "Featured" badge
- "Build on this Card" button
- Collapsible "Other Contributions" section
- Seed creator info at bottom

#### D) ContributorAvatars Component
Overlapping avatar row with hover tooltips:

```
src/components/pulse/cards/ContributorAvatars.tsx
```

### Phase 3: AI Compilation Edge Function

New edge function: `compile-card-narrative/`

```typescript
// supabase/functions/compile-card-narrative/index.ts

// Uses Lovable AI Gateway (google/gemini-3-flash-preview)
// Follows existing enhance-pulse-content pattern

// Input: { cardId: string }
// Output: { compiled_narrative: string }

// Synthesis prompt:
// - Combine all contributions into one coherent professional paragraph
// - Preserve key insights, remove redundancy
// - Keep under 600 characters
// - No bullet points, flowing prose
```

### Phase 4: Hooks Updates

#### A) New Hook: useCompiledNarrative
```typescript
// src/hooks/queries/useCompiledNarrative.ts

export function useCompiledNarrative(cardId: string) {
  // Returns cached narrative or triggers compilation
}

export function useCompileCardNarrative() {
  // Mutation to trigger AI compilation
}
```

#### B) Update usePulseCardLayers Hook
Add unique contributors aggregation.

### Phase 5: Detail Page Refactor

Update `PulseCardDetailPage.tsx`:

```
Layout Structure:
+-------------------------------------------+
|  [Topic Badge] [Stats: Views/Builds/Shares] |
|                                             |
|  +---------------------------------------+  |
|  |  [Read]      |      [Contributors]    |  |
|  +---------------------------------------+  |
|                                             |
|  +----- Content Area (animated) ---------+  |
|  |                                       |  |
|  |  (CompiledView OR ContributorsView)  |  |
|  |                                       |  |
|  +---------------------------------------+  |
|                                             |
|  [+ Improve this Knowledge] button          |
|                                             |
|  [Card started by @Creator, X time ago]     |
+-------------------------------------------+
```

## Technical Specifications

### Animation
- Use framer-motion or CSS keyframes for fade transition
- 300ms ease-in-out crossfade between views

### Responsive Design
- Mobile: Full-width toggle, stacked footer
- Tablet: Side-by-side contributor avatars and build history
- Desktop: Optimal layout as shown in spec

### Accessibility
- Toggle uses role="tablist" with aria-selected
- Keyboard navigation (Arrow keys, Enter, Space)
- Screen reader announcements for view changes
- 44px minimum touch targets

### Performance
- Lazy load contributors view (defer layer fetching)
- Cache compiled narrative (don't re-compile unless stale)
- View switch under 100ms (no API call)

## Files to Create

| File | Purpose |
|------|---------|
| `src/components/pulse/cards/ViewModeToggle.tsx` | Pill toggle component |
| `src/components/pulse/cards/CompiledView.tsx` | AI narrative view |
| `src/components/pulse/cards/ContributorsView.tsx` | Layer cards view |
| `src/components/pulse/cards/ContributorAvatars.tsx` | Overlapping avatars |
| `src/hooks/queries/useCompiledNarrative.ts` | Compilation hook |
| `supabase/functions/compile-card-narrative/index.ts` | AI synthesis function |

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/pulse/PulseCardDetailPage.tsx` | Integrate dual view system |
| `src/components/pulse/cards/index.ts` | Export new components |
| `src/constants/pulseCards.constants.ts` | Add compilation constants |
| `supabase/config.toml` | Add new edge function |

## UX Flow

1. User opens card detail page
2. Default view: "Read" (Compiled View)
   - Shows AI-synthesized narrative
   - Contributor avatars at bottom
   - "Improve this Knowledge" CTA
3. User taps "Contributors" toggle
   - Smooth fade transition
   - Featured contribution at top
   - "Build on this Card" button
   - Other contributions below
4. User taps "Build on this Card"
   - Opens CreateLayerDialog
   - On success: marks narrative stale, triggers recompile
5. User can switch back to "Read" view
   - Shows updated narrative (or "Compiling..." spinner)

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Single contribution | Compiled view shows original text as-is |
| No contributions yet | Show "Be the first to add knowledge" placeholder |
| AI compilation fails | Fallback to featured layer text + "Auto-synthesis unavailable" |
| Stale narrative | Show existing + subtle "Updating..." indicator |
| Empty card | Disable toggle, show only "Add Knowledge" CTA |

## Implementation Sequence

1. **Database Migration**: Add compiled_narrative fields + trigger
2. **Edge Function**: Create compile-card-narrative function
3. **Components**: Build ViewModeToggle, CompiledView, ContributorAvatars
4. **Hooks**: Create useCompiledNarrative
5. **Integration**: Refactor PulseCardDetailPage with new components
6. **Polish**: Animations, loading states, error handling
7. **Testing**: Verify accessibility, mobile responsiveness, AI fallback
