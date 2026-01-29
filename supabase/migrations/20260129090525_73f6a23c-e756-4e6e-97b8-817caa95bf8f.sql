-- =====================================================
-- INDUSTRY PULSE MODULE - PHASE 1: ENUMS
-- Creates 7 new enum types for the Pulse module
-- =====================================================

-- 1. Content Type Enum (6 content formats)
CREATE TYPE public.pulse_content_type AS ENUM (
  'reel',
  'podcast', 
  'spark',
  'article',
  'gallery',
  'post'
);

-- 2. Content Status Enum (lifecycle states)
CREATE TYPE public.pulse_content_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'archived',
  'removed'
);

-- 3. Engagement Type Enum (4-tier engagement)
CREATE TYPE public.pulse_engagement_type AS ENUM (
  'fire',
  'gold',
  'save',
  'bookmark'
);

-- 4. Notification Type Enum (all notification events)
CREATE TYPE public.pulse_notification_type AS ENUM (
  'new_follower',
  'fire_reaction',
  'gold_award',
  'comment',
  'comment_reply',
  'streak_reminder',
  'loot_box_ready',
  'level_up',
  'skill_verified',
  'leaderboard_rank_change',
  'content_milestone',
  'system'
);

-- 5. Report Type Enum (moderation categories)
CREATE TYPE public.pulse_report_type AS ENUM (
  'spam',
  'harassment',
  'misinformation',
  'inappropriate',
  'copyright',
  'other'
);

-- 6. Report Status Enum (report workflow)
CREATE TYPE public.pulse_report_status AS ENUM (
  'pending',
  'under_review',
  'actioned',
  'dismissed'
);

-- 7. Verification Source Enum (skill verification)
CREATE TYPE public.pulse_verification_source AS ENUM (
  'self_declared',
  'assessment_passed',
  'interview_verified',
  'platform_awarded'
);