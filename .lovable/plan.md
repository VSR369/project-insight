

# Comprehensive Social Channel Test Suite Implementation Plan

## Executive Summary

This plan expands the existing 45-test suite to **~100 comprehensive tests** fully aligned with your Lovable.dev Industry Pulse architecture. The tests are designed to run when a Platform Admin clicks "Social Channel Test" and will validate all social interactions, gamification mechanics, edge functions, and multi-provider scenarios.

---

## Current State Analysis

### Existing Test Coverage (45 tests / 11 categories)
| Category | Count | Status |
|----------|-------|--------|
| Content Creation | 6 | ✅ Basic coverage |
| Engagements | 6 | ✅ Basic coverage |
| Comments | 4 | ✅ Complete |
| Connections | 4 | ✅ Complete |
| XP & Gamification | 4 | ⚠️ Missing streak/loot box |
| Leaderboards | 3 | ✅ Complete |
| Feed & Discovery | 4 | ✅ Complete |
| Multi-Provider | 4 | ✅ Complete |
| Notifications | 3 | ⚠️ Missing types validation |
| Security & RLS | 3 | ⚠️ Missing permission tests |
| Pulse Cards | 4 | ✅ Complete |

### Database Tables Confirmed (from types.ts)
- `pulse_content` (visibility_boost fields ✅)
- `pulse_engagements` (provider_id, content_id ✅)
- `pulse_comments` (parent_comment_id for nested replies ✅)
- `pulse_connections` (follower_id, following_id ✅)
- `pulse_provider_stats` (streak, gold_token_balance, visibility_boost_tokens ✅)
- `pulse_daily_standups` (visibility_boost_earned, xp_awarded ✅)
- `pulse_loot_boxes` (claim_date, rewards ✅)
- `pulse_skills` (is_verified, verification_source ✅)
- `pulse_xp_snapshots` (total_xp_at_date ✅)
- `pulse_xp_audit_log` (action_type, xp_change ✅)
- `pulse_notifications` (notification_type, is_read ✅)
- `pulse_card_topics`, `pulse_cards`, `pulse_card_layers`, `pulse_card_votes` ✅

### Edge Functions Available
- `claim-pulse-loot-box` - Loot box claiming with streak multiplier
- `enhance-pulse-content` - AI content enhancement
- `award-pulse-xp` - XP award via RPC
- `send-streak-reminder` - Streak notifications

### RPC Functions Available
- `pulse_award_xp(provider_id, xp_amount, action_type, ...)`
- `pulse_update_streak(provider_id)`
- `pulse_get_streak_multiplier(streak)`
- `pulse_calculate_level(total_xp)`
- `pulse_cards_get_reputation(provider_id)`

---

## Implementation Plan: Expand to ~100 Tests

### New Test Categories to Add (6 new categories)

| Category ID | Category Name | Test Count |
|-------------|---------------|------------|
| DS | Daily Standups | 5 |
| LX | Loot Boxes | 5 |
| SK | Skills & Verification | 6 |
| VB | Visibility Boost | 4 |
| EF | Edge Functions | 5 |
| NC | Negative Cases | 8 |

### Enhanced Existing Categories

| Category | Current | New Total | Added Tests |
|----------|---------|-----------|-------------|
| Content Creation | 6 | 10 | +4 (validation, AI enhancement) |
| Engagements | 6 | 10 | +4 (self-engagement, gold tokens) |
| XP & Gamification | 4 | 8 | +4 (streak, XP RPC) |
| Notifications | 3 | 6 | +3 (types, actor tracking) |
| Security & RLS | 3 | 8 | +5 (permission denials) |

---

## Complete Test Case Inventory (~100 Tests)

### Category 1: Content Creation (CC-xxx) - 10 tests
| ID | Test Name | Validation |
|----|-----------|------------|
| CC-001 | Query published content | `pulse_content.content_status = 'published'` |
| CC-002 | Query spark content | `content_type = 'spark'` |
| CC-003 | Query article content | `content_type = 'article'` with `body_text` |
| CC-004 | Content status values | Validate enum: draft, published, archived |
| CC-005 | Soft delete flag exists | `is_deleted` field present |
| CC-006 | Content type variety | All 6 types: reel, podcast, spark, article, gallery, post |
| CC-007 | **NEW**: Visibility boost fields | `visibility_boost_multiplier`, `visibility_boost_expires_at` |
| CC-008 | **NEW**: Content has provider link | `provider_id` not null |
| CC-009 | **NEW**: AI enhanced tracking | `ai_enhanced`, `original_caption` fields |
| CC-010 | **NEW**: Media URL structure | `media_urls` is valid JSON array |

### Category 2: Engagements (EN-xxx) - 10 tests
| ID | Test Name | Validation |
|----|-----------|------------|
| EN-001 | Query fire engagements | `engagement_type = 'fire'` |
| EN-002 | Query gold engagements | `engagement_type = 'gold'` |
| EN-003 | Query save engagements | `engagement_type = 'save'` |
| EN-004 | Query bookmark engagements | `engagement_type = 'bookmark'` (private) |
| EN-005 | Content engagement counts | `fire_count`, `gold_count`, `save_count` |
| EN-006 | Engagement types valid | Enum validation |
| EN-007 | **NEW**: No self-engagement data | Verify no engagement where `content.provider_id = engagement.provider_id` |
| EN-008 | **NEW**: Unique engagement constraint | Check for duplicates |
| EN-009 | **NEW**: Engagement timestamps | `created_at` present |
| EN-010 | **NEW**: Gold token requirement | Verify gold_token_balance logic |

### Category 3: Comments (CM-xxx) - 4 tests (unchanged)
| ID | Test Name | Validation |
|----|-----------|------------|
| CM-001 | Top-level comments | `parent_comment_id IS NULL` |
| CM-002 | Nested replies | `parent_comment_id IS NOT NULL` |
| CM-003 | Comment soft delete | `is_deleted` field |
| CM-004 | Comment content validation | `comment_text` not empty |

### Category 4: Connections (FL-xxx) - 4 tests (unchanged)
| ID | Test Name | Validation |
|----|-----------|------------|
| FL-001 | Query connections | `pulse_connections` queryable |
| FL-002 | Connection structure | `follower_id`, `following_id` |
| FL-003 | No self-follows | `follower_id != following_id` |
| FL-004 | Connection timestamps | `created_at` present |

### Category 5: XP & Gamification (XP-xxx) - 8 tests
| ID | Test Name | Validation |
|----|-----------|------------|
| XP-001 | Provider stats exist | `pulse_provider_stats` queryable |
| XP-002 | XP values non-negative | `total_xp >= 0` |
| XP-003 | Level calculation valid | `current_level >= 1` |
| XP-004 | XP audit log exists | `pulse_xp_audit_log` queryable |
| XP-005 | **NEW**: Streak fields | `current_streak`, `longest_streak` |
| XP-006 | **NEW**: Gold token balance | `gold_token_balance` field |
| XP-007 | **NEW**: Contribution counts | `total_posts`, `total_sparks`, etc. |
| XP-008 | **NEW**: Activity date tracking | `last_activity_date` field |

### Category 6: Leaderboards (LB-xxx) - 3 tests (unchanged)
| ID | Test Name | Validation |
|----|-----------|------------|
| LB-001 | Leaderboard query | Ordered by `total_xp DESC` |
| LB-002 | XP snapshot table | `pulse_xp_snapshots` with `total_xp_at_date` |
| LB-003 | Leaderboard ordering | Descending XP sort correct |

### Category 7: Feed & Discovery (FD-xxx) - 4 tests (unchanged)
| ID | Test Name | Validation |
|----|-----------|------------|
| FD-001 | Published feed query | `content_status = 'published'` |
| FD-002 | Content type filter | Filter by specific type |
| FD-003 | Industry filter | `industry_segment_id` filter |
| FD-004 | Provider content filter | Filter by `provider_id` |

### Category 8: Multi-Provider (MP-xxx) - 4 tests (unchanged)
| ID | Test Name | Validation |
|----|-----------|------------|
| MP-001 | Multiple providers exist | `COUNT(*) >= 2` |
| MP-002 | Cross-provider content | Content from 2+ providers |
| MP-003 | Cross-provider connections | Connections exist |
| MP-004 | Provider isolation | Own vs. other content |

### Category 9: Notifications (NT-xxx) - 6 tests
| ID | Test Name | Validation |
|----|-----------|------------|
| NT-001 | Notifications query | `pulse_notifications` queryable |
| NT-002 | Unread count query | `is_read = false` filter |
| NT-003 | Notification types | `notification_type` enum values |
| NT-004 | **NEW**: Actor tracking | `related_provider_id` |
| NT-005 | **NEW**: Content reference | `related_content_id` |
| NT-006 | **NEW**: Timestamp ordering | `created_at` DESC |

### Category 10: Security & RLS (SR-xxx) - 8 tests
| ID | Test Name | Validation |
|----|-----------|------------|
| SR-001 | RLS on pulse_content | Published content visible |
| SR-002 | RLS on engagements | Own engagements accessible |
| SR-003 | RLS on connections | Own connections accessible |
| SR-004 | **NEW**: Auth required | User must be authenticated |
| SR-005 | **NEW**: Provider exists for user | `solution_providers.user_id` |
| SR-006 | **NEW**: Stats auto-created | Stats exist for provider |
| SR-007 | **NEW**: No cross-tenant leak | Provider isolation |
| SR-008 | **NEW**: Soft delete respects RLS | Deleted content hidden |

### Category 11: Pulse Cards (PC-xxx) - 4 tests (unchanged)
| ID | Test Name | Validation |
|----|-----------|------------|
| PC-001 | Card topics query | `pulse_card_topics` |
| PC-002 | Cards query | `pulse_cards` with `compiled_narrative` |
| PC-003 | Card layers query | `pulse_card_layers` with `layer_order`, `content_text` |
| PC-004 | Card votes query | `pulse_card_votes` with `voter_id` |

### Category 12: Daily Standups (DS-xxx) - 5 tests **NEW**
| ID | Test Name | Validation |
|----|-----------|------------|
| DS-001 | Standup table exists | `pulse_daily_standups` queryable |
| DS-002 | Standup structure | `standup_date`, `completed_at`, `xp_awarded` |
| DS-003 | Visibility boost earned | `visibility_boost_earned` boolean |
| DS-004 | Updates viewed tracking | `updates_viewed` counter |
| DS-005 | One standup per day | Unique on `(provider_id, standup_date)` |

### Category 13: Loot Boxes (LX-xxx) - 5 tests **NEW**
| ID | Test Name | Validation |
|----|-----------|------------|
| LX-001 | Loot box table exists | `pulse_loot_boxes` queryable |
| LX-002 | Loot box structure | `claim_date`, `available_at`, `expires_at` |
| LX-003 | Rewards structure | `rewards` JSONB field |
| LX-004 | Loot box claims table | `pulse_loot_box_claims` if exists |
| LX-005 | One loot box per day | Unique on `(provider_id, claim_date)` |

### Category 14: Skills & Verification (SK-xxx) - 6 tests **NEW**
| ID | Test Name | Validation |
|----|-----------|------------|
| SK-001 | Skills table exists | `pulse_skills` queryable |
| SK-002 | Skill structure | `skill_name`, `current_xp`, `current_level` |
| SK-003 | Industry link | `industry_segment_id` FK |
| SK-004 | Verification fields | `is_verified`, `verified_at`, `verification_source` |
| SK-005 | Expertise level link | `expertise_level_id` FK |
| SK-006 | Skill XP non-negative | `current_xp >= 0` |

### Category 15: Visibility Boost (VB-xxx) - 4 tests **NEW**
| ID | Test Name | Validation |
|----|-----------|------------|
| VB-001 | Boost fields on content | `visibility_boost_multiplier` >= 1 |
| VB-002 | Boost expiry tracking | `visibility_boost_expires_at` field |
| VB-003 | Boost tokens on stats | `visibility_boost_tokens` field |
| VB-004 | Boost multiplier calculation | RPC or trigger logic |

### Category 16: Edge Functions (EF-xxx) - 5 tests **NEW**
| ID | Test Name | Validation |
|----|-----------|------------|
| EF-001 | Award XP RPC exists | `pulse_award_xp` callable |
| EF-002 | Update streak RPC exists | `pulse_update_streak` callable |
| EF-003 | Streak multiplier RPC | `pulse_get_streak_multiplier` returns 1.0-3.0 |
| EF-004 | Level calculation RPC | `pulse_calculate_level` returns >= 1 |
| EF-005 | Reputation RPC | `pulse_cards_get_reputation` callable |

### Category 17: Negative Cases (NC-xxx) - 8 tests **NEW**
| ID | Test Name | Validation |
|----|-----------|------------|
| NC-001 | No unauthenticated access | Auth check on all tables |
| NC-002 | Self-engagement check | Business logic prevents self-fire |
| NC-003 | Self-follow check | Database constraint check |
| NC-004 | Deleted content hidden | `is_deleted = true` filtered |
| NC-005 | Invalid content type rejected | Enum constraint |
| NC-006 | Invalid engagement type rejected | Enum constraint |
| NC-007 | Empty comment rejected | Validation logic |
| NC-008 | Duplicate engagement prevented | Unique constraint |

---

## Technical Implementation

### File Structure
```
src/services/pulseSocialTestRunner.ts  (MODIFY - expand from ~1000 to ~1800 lines)
src/hooks/usePulseSocialTestRunner.ts  (NO CHANGES)
src/pages/admin/PulseSocialTestPage.tsx (NO CHANGES)
```

### Implementation Approach

1. **Add New Category Arrays**
```typescript
// Category 12: Daily Standup Tests
const dailyStandupTests: TestCase[] = [
  {
    id: "DS-001",
    category: "Daily Standups",
    name: "Standup table exists",
    description: "Verify pulse_daily_standups is queryable",
    run: () => runTest(async () => {
      const { error } = await supabase
        .from("pulse_daily_standups")
        .select("id, provider_id, standup_date, completed_at, xp_awarded")
        .limit(1);
      if (error) throw new Error(`Query failed: ${error.message}`);
    }),
  },
  // ... more tests
];
```

2. **Add New Tests to Existing Categories**
```typescript
// Add to engagementTests array:
{
  id: "EN-007",
  category: "Engagements",
  name: "No self-engagement exists",
  description: "Verify no engagement where provider = content owner",
  run: () => runTest(async () => {
    const { data, error } = await supabase
      .from("pulse_engagements")
      .select(`
        id,
        provider_id,
        content:pulse_content!inner(provider_id)
      `)
      .eq("is_deleted", false)
      .limit(100);
    
    if (error) throw new Error(`Query failed: ${error.message}`);
    
    const selfEngagements = (data || []).filter(
      e => e.provider_id === (e.content as any)?.provider_id
    );
    
    if (selfEngagements.length > 0) {
      throw new Error(`Found ${selfEngagements.length} self-engagement records`);
    }
  }),
},
```

3. **Add RPC Tests**
```typescript
{
  id: "EF-003",
  category: "Edge Functions",
  name: "Streak multiplier RPC",
  description: "Verify pulse_get_streak_multiplier returns valid range",
  run: () => runTest(async () => {
    // Test various streak values
    for (const streak of [0, 7, 14, 30, 90, 180, 365]) {
      const { data, error } = await supabase.rpc("pulse_get_streak_multiplier", {
        p_streak: streak,
      });
      
      if (error) throw new Error(`RPC failed for streak ${streak}: ${error.message}`);
      if (data < 1.0 || data > 3.0) {
        throw new Error(`Invalid multiplier ${data} for streak ${streak}`);
      }
    }
  }),
},
```

4. **Update testCategories Export**
```typescript
export const testCategories: TestCategory[] = [
  // ... existing categories
  {
    id: "daily-standups",
    name: "Daily Standups",
    description: "Tests for daily standup completion and rewards",
    tests: dailyStandupTests,
  },
  {
    id: "loot-boxes",
    name: "Loot Boxes",
    description: "Tests for loot box claiming and rewards",
    tests: lootBoxTests,
  },
  {
    id: "skills",
    name: "Skills & Verification",
    description: "Tests for skills and verification system",
    tests: skillsTests,
  },
  {
    id: "visibility-boost",
    name: "Visibility Boost",
    description: "Tests for visibility boost mechanics",
    tests: visibilityBoostTests,
  },
  {
    id: "edge-functions",
    name: "Edge Functions & RPCs",
    description: "Tests for database functions and edge functions",
    tests: edgeFunctionTests,
  },
  {
    id: "negative-cases",
    name: "Negative Cases",
    description: "Tests for validation and constraint enforcement",
    tests: negativeCaseTests,
  },
];
```

---

## Expected Results After Implementation

| Metric | Before | After |
|--------|--------|-------|
| Total Tests | 45 | ~100 |
| Categories | 11 | 17 |
| Coverage | ~45% | ~95% |

### Test Distribution
| Category Type | Count |
|---------------|-------|
| Data Validation | 45 |
| Business Logic | 20 |
| RPC/Edge Function | 10 |
| Security/RLS | 15 |
| Negative Cases | 10 |

---

## Test Behavior Notes

### Tests That Always Pass
- Schema validation tests (table exists, columns exist)
- Enum validation tests (valid values only)

### Tests That May Skip (Valid Behavior)
- Tests requiring current provider (admin without provider profile)
- Multi-provider tests (< 2 providers in system)
- Cross-provider connection tests (no connections exist)

### Tests That Should Never Skip
- RPC function tests (always callable)
- Auth validation tests (always run)
- Constraint validation tests (always run)

---

## Files to Modify

| File | Change Type | Description |
|------|-------------|-------------|
| `src/services/pulseSocialTestRunner.ts` | Major expansion | Add 6 new categories, ~55 new tests |

---

## Success Criteria

After implementation:
1. ✅ **100 tests visible** in dashboard across 17 categories
2. ✅ **Run All Tests** executes all tests sequentially
3. ✅ **Zero test failures** on properly configured data
4. ✅ **Expected skips** only for missing prerequisite data
5. ✅ **RPC tests** verify database function availability
6. ✅ **Negative tests** confirm constraint enforcement
7. ✅ **Export** generates complete JSON report with all results

