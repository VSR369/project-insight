
# PulsePages (Pulse Card) - Comprehensive Implementation Plan

## Executive Summary

Add a new "Pulse Card" feature to the Industry Pulse module — a collaborative, bite-sized knowledge system following the "Build, Don't Battle" philosophy. This is **additive only** and will NOT modify existing pulse functionality.

---

## 1. Architecture Overview

```text
┌───────────────────────────────────────────────────────────────────────────┐
│                         PULSEPAGES ARCHITECTURE                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  NAVIGATION                                                               │
│  ───────────                                                              │
│  Feed │ Sparks │ Cards │ Create │ Ranks │ Profile                         │
│                   ▲                                                       │
│                   └── NEW MENU ITEM                                       │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  PAGES                                                                    │
│  ─────                                                                    │
│  /pulse/cards          → Card Feed (swipeable deck browser)               │
│  /pulse/cards/:cardId  → Card Detail with layers                          │
│  /pulse/cards/create   → Create new card (gated by reputation)            │
│                                                                           │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  DATABASE TABLES (NEW - pulse_ prefixed)                                  │
│  ─────────────────────────────────────────────────────────────────────────│
│                                                                           │
│  pulse_card_topics     → Topic categories for organizing cards            │
│  pulse_cards           → Seed cards (280 chars + 1 media)                 │
│  pulse_card_layers     → Build layers stacked on cards                    │
│  pulse_card_votes      → Community votes for featuring layers             │
│  pulse_reputation_log  → Reputation points tracking                       │
│  pulse_card_flags      → Flag reports for moderation                      │
│  pulse_trust_council   → Weekly rotating council members                  │
│  pulse_moderation_actions → Transparent moderation history                │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Database Schema Design

### 2.1 New Tables (8 tables)

#### Table: `pulse_card_topics`
```sql
CREATE TABLE public.pulse_card_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  icon VARCHAR(50),
  color VARCHAR(20),
  industry_segment_id UUID REFERENCES public.industry_segments(id),
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  card_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

#### Table: `pulse_cards` (Core Card Entity)
```sql
CREATE TABLE public.pulse_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.pulse_card_topics(id) NOT NULL,
  seed_creator_id UUID REFERENCES public.solution_providers(id) NOT NULL, -- Immutable
  current_featured_layer_id UUID, -- FK added after layers table
  
  -- Status: active | flagged | archived
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  
  -- Metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  build_count INTEGER DEFAULT 0, -- Number of layers
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);
```

#### Table: `pulse_card_layers` (Card Versions)
```sql
CREATE TABLE public.pulse_card_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.pulse_cards(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  
  -- Content (280 chars max + 1 media)
  content_text VARCHAR(280) NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20), -- image | video | null
  
  -- Hierarchy (threading support)
  parent_layer_id UUID REFERENCES public.pulse_card_layers(id),
  layer_order INTEGER DEFAULT 0,
  
  -- Voting
  votes_up INTEGER DEFAULT 0,
  votes_down INTEGER DEFAULT 0,
  vote_score INTEGER GENERATED ALWAYS AS (votes_up - votes_down) STORED,
  is_featured BOOLEAN DEFAULT FALSE,
  featured_at TIMESTAMPTZ,
  
  -- Status: active | flagged | archived
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  voting_ends_at TIMESTAMPTZ, -- 24hr voting window
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add FK after table exists
ALTER TABLE public.pulse_cards 
  ADD CONSTRAINT fk_featured_layer 
  FOREIGN KEY (current_featured_layer_id) 
  REFERENCES public.pulse_card_layers(id);
```

#### Table: `pulse_card_votes`
```sql
CREATE TABLE public.pulse_card_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID REFERENCES public.pulse_card_layers(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('up', 'down')),
  vote_weight INTEGER DEFAULT 1, -- Experts get 2x weight
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(layer_id, voter_id)
);
```

#### Table: `pulse_reputation_log`
```sql
CREATE TABLE public.pulse_reputation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  points_delta INTEGER NOT NULL,
  reason TEXT,
  reference_type VARCHAR(50), -- card | layer | flag | verification
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast reputation calculation
CREATE INDEX idx_reputation_provider ON public.pulse_reputation_log(provider_id, created_at);
```

#### Table: `pulse_card_flags`
```sql
CREATE TABLE public.pulse_card_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('card', 'layer')),
  target_id UUID NOT NULL,
  reporter_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  flag_type VARCHAR(50) NOT NULL, -- spam | false_claim | uncited | unconstructive | other
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL, -- pending | upheld | rejected
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Table: `pulse_trust_council`
```sql
CREATE TABLE public.pulse_trust_council (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_id, week_start)
);
```

#### Table: `pulse_moderation_actions`
```sql
CREATE TABLE public.pulse_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES public.pulse_card_flags(id),
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL, -- warning | mute_7d | archive | strike
  council_votes JSONB DEFAULT '{}'::jsonb,
  outcome VARCHAR(20) NOT NULL, -- upheld | rejected
  reasoning TEXT NOT NULL, -- Public reasoning
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit trail
  created_by UUID REFERENCES auth.users(id)
);
```

### 2.2 Indexes (Performance)

```sql
-- Card queries
CREATE INDEX idx_cards_topic_status ON pulse_cards(topic_id, status);
CREATE INDEX idx_cards_creator ON pulse_cards(seed_creator_id);
CREATE INDEX idx_cards_status_created ON pulse_cards(status, created_at DESC);

-- Layer queries  
CREATE INDEX idx_layers_card_featured ON pulse_card_layers(card_id, is_featured);
CREATE INDEX idx_layers_votes ON pulse_card_layers(vote_score DESC);
CREATE INDEX idx_layers_creator ON pulse_card_layers(creator_id);

-- Votes
CREATE INDEX idx_votes_layer ON pulse_card_votes(layer_id);

-- Reputation
CREATE INDEX idx_reputation_provider_total ON pulse_reputation_log(provider_id);

-- Flags
CREATE INDEX idx_flags_status ON pulse_card_flags(status, created_at);
```

### 2.3 RLS Policies

```sql
-- Cards: Anyone can read active, creators can manage own
ALTER TABLE pulse_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active cards visible to all" ON pulse_cards
  FOR SELECT USING (status = 'active' OR has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Creators can insert cards" ON pulse_cards
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = seed_creator_id AND sp.user_id = auth.uid())
  );

-- Layers: Similar pattern
ALTER TABLE pulse_card_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active layers visible" ON pulse_card_layers
  FOR SELECT USING (status = 'active' OR EXISTS (
    SELECT 1 FROM solution_providers sp WHERE sp.id = creator_id AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Users create own layers" ON pulse_card_layers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = creator_id AND sp.user_id = auth.uid())
  );

-- Votes: Users manage own votes
ALTER TABLE pulse_card_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own votes" ON pulse_card_votes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = voter_id AND sp.user_id = auth.uid())
  );
```

---

## 3. Reputation System Implementation

### 3.1 Reputation Tiers (Stored in constants)

```typescript
// src/constants/pulseCards.constants.ts

export const REPUTATION_TIERS = {
  SEEDLING: { min: 0, max: 49, name: 'Seedling', emoji: '🌱' },
  CONTRIBUTOR: { min: 50, max: 199, name: 'Contributor', emoji: '🌿' },
  BUILDER: { min: 200, max: 499, name: 'Builder', emoji: '🌳' },
  EXPERT: { min: 500, max: 999, name: 'Expert', emoji: '🏆', voteWeight: 2 },
  TRUST_COUNCIL: { min: 1000, max: Infinity, name: 'Trust Council', emoji: '👑' },
} as const;

export const REPUTATION_ACTIONS = {
  CARD_BUILD_RECEIVED: { points: 5, reason: 'Your card received a build' },
  LAYER_PINNED: { points: 20, reason: 'Your layer was featured' },
  FLAG_UPHELD: { points: 10, reason: 'Your flag was upheld' },
  CARD_SHARED: { points: 2, reason: 'Your card was shared' },
  CREDENTIAL_VERIFIED: { points: 100, reason: 'Industry credential verified' },
  FLAG_REJECTED: { points: -5, reason: 'Your flag was rejected' },
  CARD_ARCHIVED_VIOLATION: { points: -50, reason: 'Content archived for violation' },
  REPORT_UPHELD_AGAINST: { points: -25, reason: 'Report upheld against your content' },
} as const;

export const REPUTATION_GATES = {
  VIEW_CARDS: 0,
  REACT_COMMENT: 0,
  START_CARD: 50,
  BUILD_ON_CARD: 10,
  VOTE_LAYER: 10,
  FLAG_CONTENT: 10,
  TRUST_COUNCIL_ELIGIBLE: 1000,
} as const;
```

### 3.2 Reputation Hook

```typescript
// src/hooks/queries/usePulseReputation.ts

export function useProviderReputation(providerId: string | undefined) {
  return useQuery({
    queryKey: ['pulse-reputation', providerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pulse_reputation_log')
        .select('points_delta')
        .eq('provider_id', providerId);
      
      if (error) throw error;
      
      const total = data.reduce((sum, log) => sum + log.points_delta, 0);
      const tier = getReputationTier(total);
      
      return { total, tier, canStartCard: total >= 50, canBuild: total >= 10 };
    },
    enabled: !!providerId,
  });
}
```

---

## 4. File Structure

```text
src/
├── pages/pulse/
│   ├── PulseCardsPage.tsx          # NEW - Card feed with swipeable decks
│   ├── PulseCardDetailPage.tsx     # NEW - Single card with layers
│   └── index.ts                    # Update exports
│
├── components/pulse/
│   ├── cards/                      # NEW FOLDER
│   │   ├── index.ts
│   │   ├── PulseCard.tsx           # Single card component (280 char + media)
│   │   ├── PulseCardStack.tsx      # Swipeable card deck
│   │   ├── PulseCardLayer.tsx      # Layer component with voting
│   │   ├── PulseCardLayerList.tsx  # List of layers for a card
│   │   ├── CreateCardDialog.tsx    # Card creation modal (per mockup)
│   │   ├── CreateLayerDialog.tsx   # "Build on it" modal
│   │   ├── CardVoteButton.tsx      # Up/down vote with weight
│   │   ├── FlagCardDialog.tsx      # Report content
│   │   ├── ReputationBadge.tsx     # User tier badge
│   │   └── TopicSelector.tsx       # Topic chips
│   │
│   └── layout/
│       └── PulseBottomNav.tsx      # UPDATE - Add Cards nav item
│
├── hooks/queries/
│   ├── usePulseCards.ts            # NEW - Card CRUD operations
│   ├── usePulseCardLayers.ts       # NEW - Layer operations
│   ├── usePulseCardVotes.ts        # NEW - Voting operations
│   ├── usePulseReputation.ts       # NEW - Reputation tracking
│   ├── usePulseCardTopics.ts       # NEW - Topics CRUD
│   └── usePulseModeration.ts       # NEW - Flagging & council
│
├── constants/
│   └── pulseCards.constants.ts     # NEW - All card-related constants
│
└── lib/validations/
    └── pulseCard.ts                # NEW - Zod schemas
```

---

## 5. Component Specifications

### 5.1 PulseCard Component (per mockup)

```tsx
// Visual structure matching the mockup
┌─────────────────────────────────┐
│  🏭 [Topic Name]                │
│  ─────────────────────────────  │
│  "[Content text up to 280      │
│   characters displayed here]"   │
│                                 │
│  📷 [Media preview if present]  │
│                                 │
│  👤 @CreatorName • ⭐ Rep Score │
│  🔗 N builds • 💬 N reactions   │
└─────────────────────────────────┘
```

### 5.2 CreateCardDialog (per mockup reference)

- **Topic selector** - Dropdown with topics
- **Content textarea** - Max 280 chars with counter
- **Media type toggle** - Image / Video buttons
- **Media URL field** - Optional, with validation
- **Tip text** - "Be specific, cite sources..."
- **Cancel / Create Card buttons**
- **Remember footer** - Philosophy reminder

---

## 6. Navigation Update

### 6.1 PulseBottomNav.tsx Changes

```tsx
// Add new nav item between Sparks and Create
const navItems = [
  { path: '/pulse/feed', label: 'Feed', icon: Home },
  { path: '/pulse/sparks', label: 'Sparks', icon: Zap },
  { path: '/pulse/cards', label: 'Cards', icon: Layers },  // NEW
  { path: '/pulse/create', label: 'Create', icon: PlusCircle },
  { path: '/pulse/ranks', label: 'Ranks', icon: Trophy },
  { path: '/pulse/profile', label: 'Profile', icon: User },
];
```

### 6.2 App.tsx Route Updates

```tsx
// Add new routes
<Route path="/pulse/cards" element={<AuthGuard><PulseCardsPage /></AuthGuard>} />
<Route path="/pulse/cards/:cardId" element={<AuthGuard><PulseCardDetailPage /></AuthGuard>} />
```

---

## 7. Key UI/UX Features

### 7.1 Swipeable Card Deck (Gen Z/Alpha Native)
- Horizontal swipe navigation through cards
- Stories-style progress indicators
- 60-second video clips embedded
- Sound bits for audio explanations

### 7.2 Layer Building (Never Delete, Always Add)
- Original card content ALWAYS visible at top
- Layers stack below with vote counts
- "Featured" layer highlighted with badge
- Voting window countdown (24 hours)

### 7.3 Reputation Gating
- Visual lock icon for restricted actions
- Tooltip explains reputation needed
- Clear path to earning more reputation

### 7.4 Moderation Transparency
- All moderation actions visible
- Council reasoning displayed publicly
- Strike counter visible to user

---

## 8. API Hooks (Following Project Standards)

### 8.1 usePulseCards.ts

```typescript
// Following existing patterns from usePulseContent.ts

export function usePulseCards(filters: CardFilters = {}) {
  return useQuery({
    queryKey: ['pulse-cards', filters],
    queryFn: async () => { /* ... */ },
    refetchInterval: PULSE_POLLING_INTERVALS.FEED_MS,
  });
}

export function useCreatePulseCard() {
  return useMutation({
    mutationFn: async (card: CardInsert) => {
      // Check reputation gate (50+ required)
      const rep = await getProviderReputation(card.seed_creator_id);
      if (rep < REPUTATION_GATES.START_CARD) {
        throw new Error(`Need ${REPUTATION_GATES.START_CARD} reputation to start cards`);
      }
      
      const cardWithAudit = await withCreatedBy(card);
      // Insert card...
    },
    onError: (error) => handleMutationError(error, { operation: 'create_pulse_card' }),
  });
}
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Database + Core UI)
1. Create 8 new database tables with migrations
2. Add RLS policies and indexes
3. Create constants file with reputation tiers
4. Update navigation with Cards menu item
5. Create basic PulseCardsPage skeleton

### Phase 2: Card Operations
1. Implement usePulseCards hook (CRUD)
2. Implement usePulseCardTopics hook
3. Build CreateCardDialog component (per mockup)
4. Build PulseCard display component
5. Build PulseCardStack swipeable component

### Phase 3: Layer System
1. Implement usePulseCardLayers hook
2. Implement usePulseCardVotes hook
3. Build CreateLayerDialog component
4. Build PulseCardLayer with voting
5. Add 24-hour voting window logic

### Phase 4: Reputation System
1. Implement usePulseReputation hook
2. Add reputation gating to actions
3. Build ReputationBadge component
4. Create reputation log triggers

### Phase 5: Moderation
1. Implement flagging system
2. Build Trust Council selection logic
3. Create moderation UI for council members
4. Add strike tracking

---

## 10. Non-Functional Requirements Compliance

| Requirement | Implementation |
|-------------|----------------|
| **Audit Fields** | All tables include `created_at`, `updated_at`, `created_by`, `updated_by` |
| **Error Handling** | All mutations use `handleMutationError()` from errorHandler |
| **Tenant Isolation** | Cards scoped via `seed_creator_id` linking to provider |
| **Soft Delete** | Cards/layers use `status: archived` not hard delete |
| **RLS Policies** | All tables have appropriate RLS enabled |
| **Indexes** | Performance indexes on all query patterns |
| **Constants** | All magic numbers in `pulseCards.constants.ts` |
| **Accessibility** | ARIA labels, focus management, 44px touch targets |
| **Loading States** | Skeleton components for all async data |
| **Polling** | 30s feed refresh per technical constraints |

---

## 11. Files to Create/Modify

### New Files (18 files)
| File | Purpose |
|------|---------|
| `supabase/migrations/xxx_create_pulse_cards_tables.sql` | Database schema |
| `src/constants/pulseCards.constants.ts` | Reputation tiers, gates, actions |
| `src/lib/validations/pulseCard.ts` | Zod validation schemas |
| `src/hooks/queries/usePulseCards.ts` | Card CRUD hooks |
| `src/hooks/queries/usePulseCardLayers.ts` | Layer operations |
| `src/hooks/queries/usePulseCardVotes.ts` | Voting operations |
| `src/hooks/queries/usePulseReputation.ts` | Reputation tracking |
| `src/hooks/queries/usePulseCardTopics.ts` | Topics CRUD |
| `src/hooks/queries/usePulseModeration.ts` | Flagging & council |
| `src/pages/pulse/PulseCardsPage.tsx` | Cards feed page |
| `src/pages/pulse/PulseCardDetailPage.tsx` | Single card detail |
| `src/components/pulse/cards/index.ts` | Barrel export |
| `src/components/pulse/cards/PulseCard.tsx` | Card display |
| `src/components/pulse/cards/PulseCardStack.tsx` | Swipeable deck |
| `src/components/pulse/cards/CreateCardDialog.tsx` | Create card modal |
| `src/components/pulse/cards/PulseCardLayer.tsx` | Layer component |
| `src/components/pulse/cards/CardVoteButton.tsx` | Voting buttons |
| `src/components/pulse/cards/ReputationBadge.tsx` | User tier badge |

### Modified Files (3 files)
| File | Change |
|------|--------|
| `src/components/pulse/layout/PulseBottomNav.tsx` | Add Cards nav item |
| `src/pages/pulse/index.ts` | Export new pages |
| `src/App.tsx` | Add new routes |

---

## 12. Testing Checklist

- [ ] Create a new card (requires 50+ reputation)
- [ ] View cards in swipeable feed
- [ ] Build a layer on existing card
- [ ] Vote up/down on layers
- [ ] Verify 24-hour voting window
- [ ] Check featured layer auto-selection
- [ ] Flag inappropriate content
- [ ] Verify reputation points awarded correctly
- [ ] Test reputation gates (access denied for low rep)
- [ ] Verify audit fields populated
- [ ] Test RLS (users only see appropriate content)
- [ ] Mobile swipe gestures work
- [ ] Accessibility keyboard navigation
