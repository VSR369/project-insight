-- =====================================================
-- Phase 2: Industry Pulse Module - All 15 Tables
-- Create tables in FK dependency order with constraints,
-- indexes, and RLS policies
-- =====================================================

-- =====================================================
-- BATCH 1: Independent Tables (No FK Dependencies)
-- =====================================================

-- 1. pulse_tags - Hashtag System
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

-- 2. pulse_provider_stats - XP/Level/Streak Tracking
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

-- =====================================================
-- BATCH 2: Tables Referencing Core Entities
-- =====================================================

-- 3. pulse_content - Main Content Table
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
  
  CONSTRAINT chk_pulse_key_insight_length CHECK (key_insight IS NULL OR LENGTH(key_insight) <= 500),
  CONSTRAINT chk_pulse_headline_length CHECK (headline IS NULL OR LENGTH(headline) <= 50),
  CONSTRAINT chk_pulse_article_title_max CHECK (title IS NULL OR LENGTH(title) <= 200),
  CONSTRAINT chk_pulse_spark_required CHECK (
    content_type != 'spark' OR (headline IS NOT NULL AND key_insight IS NOT NULL)
  )
);

-- 4. pulse_skills - Provider Expertise
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

-- 5. pulse_connections - Social Graph
CREATE TABLE public.pulse_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES solution_providers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_pulse_no_self_follow CHECK (follower_id != following_id),
  CONSTRAINT uq_pulse_connections UNIQUE (follower_id, following_id)
);

-- 6. pulse_daily_standups - Daily Activity Tracking
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

-- 7. pulse_loot_boxes - Daily Rewards
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

-- =====================================================
-- BATCH 3: Tables Referencing pulse_content
-- =====================================================

-- 8. pulse_engagements - Fire/Gold/Save/Bookmark
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

-- 9. pulse_comments - Threaded Comments
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

-- 10. pulse_content_tags - Junction Table
CREATE TABLE public.pulse_content_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES pulse_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_pulse_content_tag UNIQUE (content_id, tag_id)
);

-- 11. pulse_notifications - User Notifications
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

-- 12. pulse_content_reports - Moderation Reports
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

-- 13. pulse_content_impressions - Analytics
CREATE TABLE public.pulse_content_impressions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES pulse_content(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES solution_providers(id) ON DELETE SET NULL,
  impression_type TEXT NOT NULL DEFAULT 'feed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT chk_pulse_impression_type CHECK (impression_type IN ('feed', 'detail', 'share'))
);

-- =====================================================
-- BATCH 4: Audit/Snapshot Tables
-- =====================================================

-- 14. pulse_xp_snapshots - Leaderboard History
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

-- 15. pulse_xp_audit_log - XP Change Audit Trail
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

-- =====================================================
-- PERFORMANCE INDEXES
-- =====================================================

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

-- pulse_tags indexes
CREATE INDEX idx_pulse_tags_featured ON pulse_tags(is_featured, usage_count DESC) WHERE is_active = TRUE;

-- pulse_skills indexes
CREATE INDEX idx_pulse_skills_provider ON pulse_skills(provider_id);
CREATE INDEX idx_pulse_skills_industry ON pulse_skills(industry_segment_id);

-- pulse_content_reports indexes
CREATE INDEX idx_pulse_reports_status ON pulse_content_reports(status, created_at DESC);

-- pulse_xp_audit_log indexes
CREATE INDEX idx_pulse_xp_audit_provider ON pulse_xp_audit_log(provider_id, created_at DESC);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.pulse_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_provider_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_daily_standups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_loot_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_engagements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_content_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_content_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_xp_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pulse_xp_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTION: Check if user owns provider
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_pulse_provider_owner(p_provider_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM solution_providers
    WHERE id = p_provider_id AND user_id = auth.uid()
  )
$$;

-- =====================================================
-- RLS POLICIES: pulse_tags
-- =====================================================

-- Public read active tags
CREATE POLICY "Public read active pulse_tags"
ON public.pulse_tags FOR SELECT
USING (is_active = TRUE);

-- Admin full access
CREATE POLICY "Admin manage pulse_tags"
ON public.pulse_tags FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_provider_stats
-- =====================================================

-- Owners can view own stats
CREATE POLICY "Owners view own pulse_provider_stats"
ON public.pulse_provider_stats FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Owners can update own stats
CREATE POLICY "Owners update own pulse_provider_stats"
ON public.pulse_provider_stats FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Owners can insert own stats
CREATE POLICY "Owners insert own pulse_provider_stats"
ON public.pulse_provider_stats FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Public read for leaderboards (limited fields via views later)
CREATE POLICY "Public read pulse_provider_stats"
ON public.pulse_provider_stats FOR SELECT
USING (TRUE);

-- Admin full access
CREATE POLICY "Admin manage pulse_provider_stats"
ON public.pulse_provider_stats FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_content
-- =====================================================

-- Public read published content
CREATE POLICY "Public read published pulse_content"
ON public.pulse_content FOR SELECT
USING (content_status = 'published' AND is_deleted = FALSE);

-- Owners can view all own content
CREATE POLICY "Owners view own pulse_content"
ON public.pulse_content FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Owners can insert own content
CREATE POLICY "Owners insert own pulse_content"
ON public.pulse_content FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Owners can update own content
CREATE POLICY "Owners update own pulse_content"
ON public.pulse_content FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Owners can delete (soft) own content
CREATE POLICY "Owners delete own pulse_content"
ON public.pulse_content FOR DELETE
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_content"
ON public.pulse_content FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_skills
-- =====================================================

-- Public read verified skills
CREATE POLICY "Public read verified pulse_skills"
ON public.pulse_skills FOR SELECT
USING (is_verified = TRUE);

-- Owners view own skills
CREATE POLICY "Owners view own pulse_skills"
ON public.pulse_skills FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Owners insert own skills
CREATE POLICY "Owners insert own pulse_skills"
ON public.pulse_skills FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Owners update own skills
CREATE POLICY "Owners update own pulse_skills"
ON public.pulse_skills FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_skills"
ON public.pulse_skills FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_connections
-- =====================================================

-- Public read connections
CREATE POLICY "Public read pulse_connections"
ON public.pulse_connections FOR SELECT
USING (TRUE);

-- Followers can insert own connections
CREATE POLICY "Followers insert pulse_connections"
ON public.pulse_connections FOR INSERT
WITH CHECK (is_pulse_provider_owner(follower_id));

-- Followers can delete own connections
CREATE POLICY "Followers delete pulse_connections"
ON public.pulse_connections FOR DELETE
USING (is_pulse_provider_owner(follower_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_connections"
ON public.pulse_connections FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_daily_standups
-- =====================================================

-- Owners view own standups
CREATE POLICY "Owners view own pulse_daily_standups"
ON public.pulse_daily_standups FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Owners insert own standups
CREATE POLICY "Owners insert own pulse_daily_standups"
ON public.pulse_daily_standups FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Owners update own standups
CREATE POLICY "Owners update own pulse_daily_standups"
ON public.pulse_daily_standups FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_daily_standups"
ON public.pulse_daily_standups FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_loot_boxes
-- =====================================================

-- Owners view own loot boxes
CREATE POLICY "Owners view own pulse_loot_boxes"
ON public.pulse_loot_boxes FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Owners insert own loot boxes
CREATE POLICY "Owners insert own pulse_loot_boxes"
ON public.pulse_loot_boxes FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Owners update own loot boxes
CREATE POLICY "Owners update own pulse_loot_boxes"
ON public.pulse_loot_boxes FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_loot_boxes"
ON public.pulse_loot_boxes FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_engagements
-- =====================================================

-- Public read engagements (for counts)
CREATE POLICY "Public read pulse_engagements"
ON public.pulse_engagements FOR SELECT
USING (is_deleted = FALSE);

-- Providers can insert engagements (not own content - enforced by trigger)
CREATE POLICY "Providers insert pulse_engagements"
ON public.pulse_engagements FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Providers can update own engagements (soft delete)
CREATE POLICY "Providers update own pulse_engagements"
ON public.pulse_engagements FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_engagements"
ON public.pulse_engagements FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_comments
-- =====================================================

-- Public read non-deleted comments
CREATE POLICY "Public read pulse_comments"
ON public.pulse_comments FOR SELECT
USING (is_deleted = FALSE);

-- Providers insert comments
CREATE POLICY "Providers insert pulse_comments"
ON public.pulse_comments FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Owners update own comments
CREATE POLICY "Owners update own pulse_comments"
ON public.pulse_comments FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Owners delete own comments
CREATE POLICY "Owners delete own pulse_comments"
ON public.pulse_comments FOR DELETE
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_comments"
ON public.pulse_comments FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_content_tags
-- =====================================================

-- Public read content tags
CREATE POLICY "Public read pulse_content_tags"
ON public.pulse_content_tags FOR SELECT
USING (TRUE);

-- Content owners can manage tags
CREATE POLICY "Content owners insert pulse_content_tags"
ON public.pulse_content_tags FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM pulse_content pc
    WHERE pc.id = content_id AND is_pulse_provider_owner(pc.provider_id)
  )
);

CREATE POLICY "Content owners delete pulse_content_tags"
ON public.pulse_content_tags FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM pulse_content pc
    WHERE pc.id = content_id AND is_pulse_provider_owner(pc.provider_id)
  )
);

-- Admin full access
CREATE POLICY "Admin manage pulse_content_tags"
ON public.pulse_content_tags FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_notifications
-- =====================================================

-- Owners view own notifications
CREATE POLICY "Owners view own pulse_notifications"
ON public.pulse_notifications FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Owners update own notifications (mark read)
CREATE POLICY "Owners update own pulse_notifications"
ON public.pulse_notifications FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- System/triggers can insert (no direct user insert)
CREATE POLICY "System insert pulse_notifications"
ON public.pulse_notifications FOR INSERT
WITH CHECK (has_role(auth.uid(), 'platform_admin'::app_role));

-- Admin full access
CREATE POLICY "Admin manage pulse_notifications"
ON public.pulse_notifications FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_content_reports
-- =====================================================

-- Reporters can view own reports
CREATE POLICY "Reporters view own pulse_content_reports"
ON public.pulse_content_reports FOR SELECT
USING (is_pulse_provider_owner(reporter_id));

-- Reporters can insert reports
CREATE POLICY "Reporters insert pulse_content_reports"
ON public.pulse_content_reports FOR INSERT
WITH CHECK (is_pulse_provider_owner(reporter_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_content_reports"
ON public.pulse_content_reports FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_content_impressions
-- =====================================================

-- Authenticated can insert impressions
CREATE POLICY "Authenticated insert pulse_content_impressions"
ON public.pulse_content_impressions FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Admin full access
CREATE POLICY "Admin manage pulse_content_impressions"
ON public.pulse_content_impressions FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_xp_snapshots
-- =====================================================

-- Public read for leaderboards
CREATE POLICY "Public read pulse_xp_snapshots"
ON public.pulse_xp_snapshots FOR SELECT
USING (TRUE);

-- Admin full access
CREATE POLICY "Admin manage pulse_xp_snapshots"
ON public.pulse_xp_snapshots FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));

-- =====================================================
-- RLS POLICIES: pulse_xp_audit_log
-- =====================================================

-- Owners view own audit log
CREATE POLICY "Owners view own pulse_xp_audit_log"
ON public.pulse_xp_audit_log FOR SELECT
USING (is_pulse_provider_owner(provider_id));

-- Admin full access
CREATE POLICY "Admin manage pulse_xp_audit_log"
ON public.pulse_xp_audit_log FOR ALL
USING (has_role(auth.uid(), 'platform_admin'::app_role));