

# Phase 2: Database Tables Implementation Plan

## Overview
Create all 15 `pulse_` tables in a single comprehensive migration, ordered by foreign key dependencies.

---

## Migration Structure

### Batch 1: Independent Tables (No FK Dependencies)

#### 1. `pulse_tags` - Hashtag System
```sql
CREATE TABLE public.pulse_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT,
  usage_count INTEGER NOT NULL DEFAULT 0,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

#### 2. `pulse_provider_stats` - XP/Level/Streak Tracking
```sql
CREATE TABLE public.pulse_provider_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL UNIQUE REFERENCES solution_providers(id) ON DELETE CASCADE,
  total_xp BIGINT NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  total_reels INTEGER NOT NULL DEFAULT 0,
  total_podcasts INTEGER NOT NULL DEFAULT 0,
  total_sparks INTEGER NOT NULL DEFAULT 0,
  total_articles INTEGER NOT NULL DEFAULT 0,
  total_galleries INTEGER NOT NULL DEFAULT 0,
  total_posts INTEGER NOT NULL DEFAULT 0,
  total_contributions INTEGER NOT NULL DEFAULT 0,
  total_fire_received BIGINT NOT NULL DEFAULT 0,
  total_gold_received BIGINT NOT NULL DEFAULT 0,
  total_comments_received BIGINT NOT NULL DEFAULT 0,
  total_saves_received BIGINT NOT NULL DEFAULT 0,
  follower_count INTEGER NOT NULL DEFAULT 0,
  following_count INTEGER NOT NULL DEFAULT 0,
  gold_token_balance INTEGER NOT NULL DEFAULT 10,
  visibility_boost_tokens INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);
```

---

### Batch 2: Tables Referencing Core Entities

#### 3. `pulse_content` - Main Content Table
```sql
CREATE TABLE public.pulse_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES provider_industry_enrollments(id) ON DELETE SET NULL,
  industry_segment_id UUID REFERENCES industry_segments(id) ON DELETE SET NULL,
  content_type pulse_content_type NOT NULL,
  content_status pulse_content_status NOT NULL DEFAULT 'draft',
  title TEXT,
  caption TEXT,
  body_text TEXT,
  headline TEXT,
  key_insight TEXT,
  ai_enhanced BOOLEAN NOT NULL DEFAULT FALSE,
  original_caption TEXT,
  media_urls JSONB NOT NULL DEFAULT '[]',
  cover_image_url TEXT,
  secondary_industry_ids UUID[] NOT NULL DEFAULT '{}',
  fire_count INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  gold_count INTEGER NOT NULL DEFAULT 0,
  save_count INTEGER NOT NULL DEFAULT 0,
  visibility_boost_multiplier DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  visibility_boost_expires_at TIMESTAMPTZ,
  is_published BOOLEAN GENERATED ALWAYS AS (content_status = 'published') STORED,
  scheduled_publish_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  -- Constraints
  CONSTRAINT chk_pulse_key_insight_length CHECK (key_insight IS NULL OR LENGTH(key_insight) <= 500),
  CONSTRAINT chk_pulse_headline_length CHECK (headline IS NULL OR LENGTH(headline) <= 50),
  CONSTRAINT chk_pulse_article_title_max CHECK (title IS NULL OR LENGTH(title) <= 200),
  CONSTRAINT chk_pulse_spark_required CHECK (
    content_type != 'spark' OR (headline IS NOT NULL AND key_insight IS NOT NULL)
  )
);
```

#### 4. `pulse_skills` - Provider Expertise
```sql
CREATE TABLE public.pulse_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  industry_segment_id UUID NOT NULL REFERENCES industry_segments(id) ON DELETE CASCADE,
  expertise_level_id UUID REFERENCES expertise_levels(id) ON DELETE SET NULL,
  verification_source pulse_verification_source,
  verification_enrollment_id UUID REFERENCES provider_industry_enrollments(id) ON DELETE SET NULL,
  skill_name TEXT NOT NULL,
  current_xp BIGINT NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  
  CONSTRAINT uq_pulse_skills_provider_industry UNIQUE (provider_id, industry_segment_id)
);
```

#### 5. `pulse_connections` - Social Graph
```sql
CREATE TABLE public.pulse_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_pulse_no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT uq_pulse_connections UNIQUE (follower_id, following_id)
);
```

#### 6. `pulse_daily_standups` - Daily Activity Tracking
```sql
CREATE TABLE public.pulse_daily_standups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  standup_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  window_start TIMESTAMPTZ,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  visibility_boost_earned BOOLEAN NOT NULL DEFAULT FALSE,
  updates_viewed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_pulse_standups_provider_date UNIQUE (provider_id, standup_date)
);
```

#### 7. `pulse_loot_boxes` - Daily Rewards
```sql
CREATE TABLE public.pulse_loot_boxes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  claim_date DATE NOT NULL,
  available_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  opened_at TIMESTAMPTZ,
  streak_at_claim INTEGER NOT NULL DEFAULT 0,
  streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00,
  rewards JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_pulse_lootbox_provider_date UNIQUE (provider_id, claim_date)
);
```

---

### Batch 3: Tables Referencing pulse_content

#### 8. `pulse_engagements` - Fire/Gold/Save/Bookmark
```sql
CREATE TABLE public.pulse_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  engagement_type pulse_engagement_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT uq_pulse_engagement UNIQUE (content_id, provider_id, engagement_type)
);
```

#### 9. `pulse_comments` - Threaded Comments
```sql
CREATE TABLE public.pulse_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES pulse_comments(id) ON DELETE CASCADE,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT chk_pulse_comment_length CHECK (LENGTH(comment_text) <= 1500)
);
```

#### 10. `pulse_content_tags` - Junction Table
```sql
CREATE TABLE public.pulse_content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES pulse_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_pulse_content_tag UNIQUE (content_id, tag_id)
);
```

#### 11. `pulse_notifications` - User Notifications
```sql
CREATE TABLE public.pulse_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  notification_type pulse_notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  related_content_id UUID REFERENCES pulse_content(id) ON DELETE CASCADE,
  related_provider_id UUID REFERENCES solution_providers(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 12. `pulse_content_reports` - Moderation Reports
```sql
CREATE TABLE public.pulse_content_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  report_type pulse_report_type NOT NULL,
  description TEXT,
  status pulse_report_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 13. `pulse_content_impressions` - Analytics
```sql
CREATE TABLE public.pulse_content_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES solution_providers(id) ON DELETE SET NULL,
  impression_type TEXT NOT NULL DEFAULT 'feed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_pulse_impression_type CHECK (impression_type IN ('feed', 'detail', 'share'))
);
```

---

### Batch 4: Audit/Snapshot Tables

#### 14. `pulse_xp_snapshots` - Leaderboard History
```sql
CREATE TABLE public.pulse_xp_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  snapshot_type TEXT NOT NULL DEFAULT 'daily',
  total_xp_at_date BIGINT NOT NULL DEFAULT 0,
  current_level_at_date INTEGER NOT NULL DEFAULT 1,
  follower_count_at_date INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_pulse_snapshot UNIQUE (provider_id, snapshot_date, snapshot_type),
  CONSTRAINT chk_pulse_snapshot_type CHECK (snapshot_type IN ('daily', 'weekly', 'monthly'))
);
```

#### 15. `pulse_xp_audit_log` - XP Change Audit Trail
```sql
CREATE TABLE public.pulse_xp_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  xp_change INTEGER NOT NULL,
  previous_total BIGINT NOT NULL,
  new_total BIGINT NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);
```

---

## Performance Indexes

```sql
-- pulse_content indexes
CREATE INDEX idx_pulse_content_provider ON pulse_content(provider_id, created_at DESC);
CREATE INDEX idx_pulse_content_industry ON pulse_content(industry_segment_id, created_at DESC);
CREATE INDEX idx_pulse_content_status ON pulse_content(content_status, is_deleted) WHERE content_status = 'published';
CREATE INDEX idx_pulse_content_type ON pulse_content(content_type, created_at DESC);
CREATE INDEX idx_pulse_content_feed ON pulse_content(created_at DESC) WHERE content_status = 'published' AND is_deleted = FALSE;

-- pulse_engagements indexes
CREATE INDEX idx_pulse_engagements_content ON pulse_engagements(content_id, engagement_type);
CREATE INDEX idx_pulse_engagements_provider ON pulse_engagements(provider_id, created_at DESC);

-- pulse_comments indexes
CREATE INDEX idx_pulse_comments_content ON pulse_comments(content_id, created_at DESC);
CREATE INDEX idx_pulse_comments_parent ON pulse_comments(parent_comment_id);

-- pulse_connections indexes
CREATE INDEX idx_pulse_connections_follower ON pulse_connections(follower_id);
CREATE INDEX idx_pulse_connections_following ON pulse_connections(following_id);

-- pulse_notifications indexes
CREATE INDEX idx_pulse_notifications_provider ON pulse_notifications(provider_id, is_read, created_at DESC);

-- pulse_xp_snapshots indexes
CREATE INDEX idx_pulse_snapshots_leaderboard ON pulse_xp_snapshots(snapshot_date, total_xp_at_date DESC);

-- pulse_provider_stats indexes
CREATE INDEX idx_pulse_stats_xp ON pulse_provider_stats(total_xp DESC);
CREATE INDEX idx_pulse_stats_level ON pulse_provider_stats(current_level DESC);
```

---

## RLS Policies

All 15 tables will have RLS enabled with these policy patterns:

1. **Owner Access** - Users can manage their own data
2. **Admin Override** - Platform admins have full access
3. **Public Read** - Published content is publicly readable
4. **Self-Engagement Prevention** - Users cannot engage with their own content

---

## Technical Notes

- **FK Ordering**: Tables created in dependency order to prevent FK errors
- **Generated Column**: `is_published` uses `GENERATED ALWAYS AS` for automatic status tracking
- **Soft Delete**: `pulse_content` and `pulse_comments` support soft delete pattern
- **Audit Fields**: All content tables include `created_by`, `updated_by` for audit compliance
- **JSONB Fields**: `media_urls`, `rewards`, `data` use JSONB for flexible structured data

---

## Deliverables

| Category | Count |
|----------|-------|
| Tables | 15 |
| Indexes | 14 |
| Unique Constraints | 8 |
| Check Constraints | 6 |
| RLS Policies | ~30 |

**Ready to execute**: Single migration file with all 15 tables, constraints, indexes, and RLS policies.

