
# Plan: Add Full Pulse Social Rules to Pulse Cards

## Executive Summary
This plan adds all standard Pulse Social features to Pulse Cards to make them fully integrated with the gamification system, exactly like Reels, Articles, Sparks, and other feed content types.

---

## Current State Analysis

### What Pulse Content (Reels/Articles/Sparks/Posts) Has:
| Feature | Implementation |
|---------|----------------|
| **XP for Creation** | podcast=200, reel=100, article=150, gallery=75, spark=50, post=25 |
| **Engagement Buttons** | Fire (🔥), Gold (🥇), Save (💾), Bookmark |
| **XP for Engagements Received** | fire=+2 XP, gold=+15 XP, save=+5 XP |
| **Engagement Counts** | fire_count, gold_count, save_count, comment_count on pulse_content |
| **Stats Tracking** | total_sparks, total_reels, total_podcasts, etc. in pulse_provider_stats |
| **Streak Integration** | Creates content → updates streak → affects loot box multiplier |
| **Feed Ranking** | Uses engagement counts in feed scoring algorithm |
| **Leaderboard Integration** | XP contributes to global/weekly/industry leaderboards |
| **EngagementBar Component** | Full UI for Fire/Gold/Save/Bookmark/Share |

### What Pulse Cards Currently Has:
| Feature | Current Status |
|---------|----------------|
| **XP for Creation** | ❌ Missing - uses separate reputation system |
| **Engagement Buttons** | ❌ Missing - only has view_count, share_count, build_count |
| **XP for Engagements Received** | ❌ Missing |
| **Engagement Counts** | ❌ Missing fire_count, gold_count, save_count |
| **Stats Tracking** | ❌ Missing total_cards, total_layers in pulse_provider_stats |
| **Streak Integration** | ❌ Missing - card creation doesn't update streak |
| **Feed Ranking** | ⚠️ Partial - uses build_count instead of engagements |
| **Leaderboard Integration** | ❌ Missing - cards don't contribute to main XP |
| **EngagementBar Component** | ❌ Missing - shows only views/contributors/shares |

---

## Implementation Plan

### Phase 1: Database Schema Updates

**1.1 Add engagement columns to `pulse_cards` table:**
```sql
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS fire_count INTEGER DEFAULT 0;
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS gold_count INTEGER DEFAULT 0;
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;
```

**1.2 Create `pulse_card_engagements` table (mirrors pulse_engagements):**
```sql
CREATE TABLE pulse_card_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES pulse_cards(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES solution_providers(id),
  engagement_type engagement_type NOT NULL, -- fire, gold, save, bookmark
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, provider_id, engagement_type)
);
```

**1.3 Add card stats to `pulse_provider_stats`:**
```sql
ALTER TABLE pulse_provider_stats 
  ADD COLUMN IF NOT EXISTS total_cards INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_layers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_card_fire_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_card_gold_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_card_saves_received INTEGER DEFAULT 0;
```

**1.4 Add XP reward constants for Cards:**
```typescript
// In pulseCards.constants.ts
export const PULSE_CARD_XP_REWARDS = {
  CARD_CREATED: 75,      // Similar to gallery
  LAYER_CREATED: 25,     // Similar to post (building on card)
  ENGAGEMENT_RECEIVED: {
    fire: 2,
    gold: 15,
    save: 5,
    bookmark: 0,
  },
} as const;
```

---

### Phase 2: Database Triggers (XP & Stats Automation)

**2.1 Create trigger: `pulse_on_card_created`**
- Awards 75 XP when card is created
- Increments `total_cards` in `pulse_provider_stats`
- Updates streak via `pulse_update_streak()`

**2.2 Create trigger: `pulse_on_layer_created`**
- Awards 25 XP when layer is added
- Increments `total_layers` in `pulse_provider_stats`
- Updates streak

**2.3 Create trigger: `pulse_on_card_engagement_change`**
- Mirrors `pulse_on_engagement_change` for regular content
- Awards XP to card creator (fire=2, gold=15, save=5)
- Updates fire_count/gold_count/save_count on pulse_cards
- Updates total_card_fire_received etc. in pulse_provider_stats

---

### Phase 3: RLS Policies for Card Engagements

```sql
-- Users can view all engagements
CREATE POLICY "Users view card engagements"
ON pulse_card_engagements FOR SELECT
USING (true);

-- Users can manage own engagements
CREATE POLICY "Users manage own card engagements"
ON pulse_card_engagements FOR ALL
USING (is_pulse_provider_owner(provider_id));
```

---

### Phase 4: React Hooks Updates

**4.1 Create `usePulseCardEngagements.ts`:**
```typescript
// Mirrors usePulseEngagements.ts but for cards
export function useCardUserEngagements(cardId, providerId)
export function useToggleCardEngagement()
export function useToggleCardFire()
export function useToggleCardGold()
export function useToggleCardSave()
export function useToggleCardBookmark()
```

**4.2 Update `usePulseCards.ts`:**
- Add `fire_count`, `gold_count`, `save_count` to PulseCard type
- Include in select queries

**4.3 Update card creation mutations:**
- Invalidate `pulse-provider-stats` after creating card/layer
- Toast message shows XP earned

---

### Phase 5: UI Component Updates

**5.1 Create `CardEngagementBar.tsx`:**
```typescript
// Mirrors EngagementBar.tsx but uses card-specific hooks
export function CardEngagementBar({
  cardId,
  creatorId,
  currentUserProviderId,
  fireCount,
  goldCount,
  saveCount,
  commentCount,
  ...
})
```

**5.2 Update `PulseCardFeedItem.tsx`:**
- Replace current footer with `CardEngagementBar`
- Show fire/gold/save/bookmark buttons
- Display counts

**5.3 Update `PulseCard.tsx`:**
- Add engagement bar in detail view
- Show XP rewards in tooltips

---

### Phase 6: Constants Updates

**6.1 Update `pulseCards.constants.ts`:**
```typescript
export const PULSE_CARD_XP_REWARDS = {
  CARD_CREATED: 75,
  LAYER_CREATED: 25,
  ENGAGEMENT_RECEIVED: {
    fire: 2,
    gold: 15,
    save: 5,
    bookmark: 0,
  },
} as const;

export const PULSE_CARD_QUERY_KEYS = {
  cardEngagements: 'pulse-card-engagements',
  userCardEngagements: 'pulse-user-card-engagements',
} as const;
```

**6.2 Update feed ranking to include card engagements:**
- Cards use same scoring: `(fire×1) + (comment×3) + (gold×10) + (save×5)`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/migrations/[timestamp].sql` | Create | Schema changes + triggers |
| `src/constants/pulseCards.constants.ts` | Modify | Add XP rewards, query keys |
| `src/hooks/queries/usePulseCardEngagements.ts` | Create | Engagement CRUD hooks |
| `src/hooks/queries/usePulseCards.ts` | Modify | Add engagement counts to types |
| `src/components/pulse/cards/CardEngagementBar.tsx` | Create | Engagement UI component |
| `src/components/pulse/content/PulseCardFeedItem.tsx` | Modify | Use CardEngagementBar |
| `src/components/pulse/cards/PulseCard.tsx` | Modify | Add engagement bar |
| `src/hooks/queries/usePulseStats.ts` | Modify | Include card stats in types |
| `src/hooks/queries/useUnifiedPulseFeed.ts` | Modify | Include card engagement counts |

---

## Feature Parity Matrix (After Implementation)

| Feature | Regular Content | Pulse Cards |
|---------|-----------------|-------------|
| XP for Creation | ✅ | ✅ (75 XP card, 25 XP layer) |
| Fire Button | ✅ | ✅ |
| Gold Button | ✅ | ✅ |
| Save Button | ✅ | ✅ |
| Bookmark Button | ✅ | ✅ |
| XP for Fire Received | ✅ +2 | ✅ +2 |
| XP for Gold Received | ✅ +15 | ✅ +15 |
| XP for Save Received | ✅ +5 | ✅ +5 |
| Streak Updates | ✅ | ✅ |
| Leaderboard Integration | ✅ | ✅ |
| Stats Tracking | ✅ | ✅ |
| Feed Ranking | ✅ | ✅ |

---

## Implementation Order

1. **Database Migration** - Add columns, create table, add triggers
2. **Constants Update** - Add XP rewards and query keys
3. **Backend Hooks** - Create engagement hooks
4. **UI Components** - Create CardEngagementBar
5. **Integration** - Wire up feed item and detail views
6. **Testing** - Verify XP awards, streak updates, leaderboard

---

## Notes

- **Backward Compatibility**: Existing cards get 0 engagement counts initially
- **Self-Engagement Block**: Cannot fire/gold own cards (same as regular content)
- **Reputation System Retained**: The existing reputation tier system for PulseCards (voting privileges, moderation) remains - this adds XP/engagement on top
- **Dual Reward**: Card creators get BOTH reputation points (existing) AND XP (new)
