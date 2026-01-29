-- =====================================================
-- Phase 3: Industry Pulse - Triggers, Functions & Storage
-- XP automation, gamification logic, media storage
-- =====================================================

-- =====================================================
-- SECTION 1: Helper Functions
-- =====================================================

-- Calculate level from XP: level = floor(sqrt(total_xp / 20)) + 1
CREATE OR REPLACE FUNCTION public.pulse_calculate_level(p_total_xp BIGINT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT GREATEST(1, FLOOR(SQRT(p_total_xp::FLOAT / 20.0))::INTEGER + 1);
$$;

-- Get streak multiplier for loot boxes
CREATE OR REPLACE FUNCTION public.pulse_get_streak_multiplier(p_streak INTEGER)
RETURNS DECIMAL(3,2)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_streak >= 365 THEN 3.00
    WHEN p_streak >= 180 THEN 2.50
    WHEN p_streak >= 90 THEN 2.00
    WHEN p_streak >= 30 THEN 1.75
    WHEN p_streak >= 14 THEN 1.50
    WHEN p_streak >= 7 THEN 1.25
    ELSE 1.00
  END::DECIMAL(3,2);
$$;

-- =====================================================
-- SECTION 2: XP Award Function (transactional with audit)
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_award_xp(
  p_provider_id UUID,
  p_xp_amount INTEGER,
  p_action_type TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_previous_total BIGINT;
  v_new_total BIGINT;
  v_new_level INTEGER;
BEGIN
  -- Get current XP with lock
  SELECT total_xp INTO v_previous_total
  FROM pulse_provider_stats
  WHERE provider_id = p_provider_id
  FOR UPDATE;

  -- If no stats record exists, create one
  IF v_previous_total IS NULL THEN
    INSERT INTO pulse_provider_stats (provider_id, total_xp)
    VALUES (p_provider_id, 0)
    ON CONFLICT (provider_id) DO NOTHING;
    v_previous_total := 0;
  END IF;

  -- Calculate new total (prevent negative)
  v_new_total := GREATEST(0, v_previous_total + p_xp_amount);
  v_new_level := pulse_calculate_level(v_new_total);

  -- Update stats
  UPDATE pulse_provider_stats
  SET total_xp = v_new_total,
      current_level = v_new_level,
      updated_at = NOW()
  WHERE provider_id = p_provider_id;

  -- Log to audit trail
  INSERT INTO pulse_xp_audit_log (
    provider_id,
    action_type,
    xp_change,
    previous_total,
    new_total,
    reference_id,
    reference_type,
    notes
  ) VALUES (
    p_provider_id,
    p_action_type,
    p_xp_amount,
    v_previous_total,
    v_new_total,
    p_reference_id,
    p_reference_type,
    p_notes
  );

  RETURN TRUE;
END;
$$;

-- =====================================================
-- SECTION 3: Streak Management Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_update_streak(p_provider_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity DATE;
  v_today DATE := CURRENT_DATE;
  v_current_streak INTEGER;
  v_longest_streak INTEGER;
  v_new_streak INTEGER;
BEGIN
  -- Get current streak info
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity, v_current_streak, v_longest_streak
  FROM pulse_provider_stats
  WHERE provider_id = p_provider_id
  FOR UPDATE;

  -- Calculate new streak
  IF v_last_activity IS NULL THEN
    -- First activity ever
    v_new_streak := 1;
  ELSIF v_last_activity = v_today THEN
    -- Already active today, no change
    v_new_streak := v_current_streak;
  ELSIF v_last_activity = v_today - 1 THEN
    -- Consecutive day, increment streak
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken, reset to 1
    v_new_streak := 1;
  END IF;

  -- Update stats
  UPDATE pulse_provider_stats
  SET current_streak = v_new_streak,
      longest_streak = GREATEST(v_longest_streak, v_new_streak),
      last_activity_date = v_today,
      updated_at = NOW()
  WHERE provider_id = p_provider_id;

  RETURN v_new_streak;
END;
$$;

-- =====================================================
-- SECTION 4: Auto-create pulse_provider_stats Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_create_provider_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pulse_provider_stats (provider_id)
  VALUES (NEW.id)
  ON CONFLICT (provider_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Attach to solution_providers table
DROP TRIGGER IF EXISTS trg_pulse_create_provider_stats ON solution_providers;
CREATE TRIGGER trg_pulse_create_provider_stats
  AFTER INSERT ON solution_providers
  FOR EACH ROW
  EXECUTE FUNCTION pulse_create_provider_stats();

-- =====================================================
-- SECTION 5: Content Creation XP Award Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_on_content_published()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_xp_amount INTEGER;
  v_content_type_col TEXT;
BEGIN
  -- Only award XP when content transitions to 'published'
  IF NEW.content_status = 'published' AND 
     (OLD.content_status IS NULL OR OLD.content_status != 'published') THEN
    
    -- XP by content type
    v_xp_amount := CASE NEW.content_type::TEXT
      WHEN 'podcast' THEN 200
      WHEN 'reel' THEN 100
      WHEN 'article' THEN 150
      WHEN 'gallery' THEN 75
      WHEN 'spark' THEN 50
      WHEN 'post' THEN 25
      ELSE 25
    END;

    -- Award XP
    PERFORM pulse_award_xp(
      NEW.provider_id,
      v_xp_amount,
      'content_created',
      NEW.id,
      NEW.content_type::TEXT,
      'Published ' || NEW.content_type::TEXT
    );

    -- Update content count in stats
    v_content_type_col := 'total_' || CASE NEW.content_type::TEXT
      WHEN 'spark' THEN 'sparks'
      WHEN 'reel' THEN 'reels'
      WHEN 'podcast' THEN 'podcasts'
      WHEN 'article' THEN 'articles'
      WHEN 'gallery' THEN 'galleries'
      WHEN 'post' THEN 'posts'
      ELSE 'posts'
    END;

    EXECUTE format(
      'UPDATE pulse_provider_stats SET %I = %I + 1, total_contributions = total_contributions + 1, updated_at = NOW() WHERE provider_id = $1',
      v_content_type_col, v_content_type_col
    ) USING NEW.provider_id;

    -- Update streak
    PERFORM pulse_update_streak(NEW.provider_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_content_published ON pulse_content;
CREATE TRIGGER trg_pulse_content_published
  AFTER INSERT OR UPDATE OF content_status ON pulse_content
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_content_published();

-- =====================================================
-- SECTION 6: Engagement Triggers (Fire/Gold/Save counts + XP)
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_on_engagement_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_owner_id UUID;
  v_xp_amount INTEGER;
  v_count_column TEXT;
  v_delta INTEGER;
BEGIN
  -- Determine delta based on operation
  IF TG_OP = 'INSERT' THEN
    v_delta := 1;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -1;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete toggle
    IF NEW.is_deleted AND NOT OLD.is_deleted THEN
      v_delta := -1;
    ELSIF NOT NEW.is_deleted AND OLD.is_deleted THEN
      v_delta := 1;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Get the content record for the engagement
  IF TG_OP = 'DELETE' THEN
    SELECT provider_id INTO v_content_owner_id
    FROM pulse_content WHERE id = OLD.content_id;
    
    v_count_column := CASE OLD.engagement_type::TEXT
      WHEN 'fire' THEN 'fire_count'
      WHEN 'gold' THEN 'gold_count'
      WHEN 'save' THEN 'save_count'
      WHEN 'bookmark' THEN NULL -- Private, no counter
    END;
  ELSE
    SELECT provider_id INTO v_content_owner_id
    FROM pulse_content WHERE id = NEW.content_id;
    
    v_count_column := CASE NEW.engagement_type::TEXT
      WHEN 'fire' THEN 'fire_count'
      WHEN 'gold' THEN 'gold_count'
      WHEN 'save' THEN 'save_count'
      WHEN 'bookmark' THEN NULL -- Private, no counter
    END;
  END IF;

  -- Update content engagement count (except bookmarks)
  IF v_count_column IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN
      EXECUTE format(
        'UPDATE pulse_content SET %I = GREATEST(0, %I + $1), updated_at = NOW() WHERE id = $2',
        v_count_column, v_count_column
      ) USING v_delta, OLD.content_id;
    ELSE
      EXECUTE format(
        'UPDATE pulse_content SET %I = GREATEST(0, %I + $1), updated_at = NOW() WHERE id = $2',
        v_count_column, v_count_column
      ) USING v_delta, NEW.content_id;
    END IF;
  END IF;

  -- Award/revoke XP to content owner (not for bookmarks)
  IF v_content_owner_id IS NOT NULL AND v_count_column IS NOT NULL THEN
    v_xp_amount := CASE 
      WHEN TG_OP = 'DELETE' THEN
        CASE OLD.engagement_type::TEXT
          WHEN 'fire' THEN 2
          WHEN 'gold' THEN 15
          WHEN 'save' THEN 5
          ELSE 0
        END
      ELSE
        CASE NEW.engagement_type::TEXT
          WHEN 'fire' THEN 2
          WHEN 'gold' THEN 15
          WHEN 'save' THEN 5
          ELSE 0
        END
    END * v_delta;

    IF v_xp_amount != 0 THEN
      PERFORM pulse_award_xp(
        v_content_owner_id,
        v_xp_amount,
        CASE WHEN v_delta > 0 THEN 'engagement_received' ELSE 'engagement_removed' END,
        COALESCE(NEW.content_id, OLD.content_id),
        COALESCE(NEW.engagement_type::TEXT, OLD.engagement_type::TEXT)
      );

      -- Update received counts in stats
      IF TG_OP = 'DELETE' THEN
        EXECUTE format(
          'UPDATE pulse_provider_stats SET total_%s_received = GREATEST(0, total_%s_received + $1), updated_at = NOW() WHERE provider_id = $2',
          CASE OLD.engagement_type::TEXT WHEN 'fire' THEN 'fire' WHEN 'gold' THEN 'gold' ELSE 'saves' END,
          CASE OLD.engagement_type::TEXT WHEN 'fire' THEN 'fire' WHEN 'gold' THEN 'gold' ELSE 'saves' END
        ) USING v_delta, v_content_owner_id;
      ELSE
        EXECUTE format(
          'UPDATE pulse_provider_stats SET total_%s_received = GREATEST(0, total_%s_received + $1), updated_at = NOW() WHERE provider_id = $2',
          CASE NEW.engagement_type::TEXT WHEN 'fire' THEN 'fire' WHEN 'gold' THEN 'gold' ELSE 'saves' END,
          CASE NEW.engagement_type::TEXT WHEN 'fire' THEN 'fire' WHEN 'gold' THEN 'gold' ELSE 'saves' END
        ) USING v_delta, v_content_owner_id;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_engagement_change ON pulse_engagements;
CREATE TRIGGER trg_pulse_engagement_change
  AFTER INSERT OR UPDATE OR DELETE ON pulse_engagements
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_engagement_change();

-- =====================================================
-- SECTION 7: Comment Count Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_on_comment_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta INTEGER;
  v_content_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_delta := 1;
    v_content_id := NEW.content_id;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -1;
    v_content_id := OLD.content_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted AND NOT OLD.is_deleted THEN
      v_delta := -1;
    ELSIF NOT NEW.is_deleted AND OLD.is_deleted THEN
      v_delta := 1;
    ELSE
      RETURN NEW;
    END IF;
    v_content_id := NEW.content_id;
  END IF;

  UPDATE pulse_content
  SET comment_count = GREATEST(0, comment_count + v_delta),
      updated_at = NOW()
  WHERE id = v_content_id;

  -- Update owner's received comments count
  UPDATE pulse_provider_stats
  SET total_comments_received = GREATEST(0, total_comments_received + v_delta),
      updated_at = NOW()
  WHERE provider_id = (SELECT provider_id FROM pulse_content WHERE id = v_content_id);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_comment_change ON pulse_comments;
CREATE TRIGGER trg_pulse_comment_change
  AFTER INSERT OR UPDATE OR DELETE ON pulse_comments
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_comment_change();

-- =====================================================
-- SECTION 8: Tag Usage Count Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_on_content_tag_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pulse_tags
    SET usage_count = usage_count + 1
    WHERE id = NEW.tag_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pulse_tags
    SET usage_count = GREATEST(0, usage_count - 1)
    WHERE id = OLD.tag_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_content_tag_change ON pulse_content_tags;
CREATE TRIGGER trg_pulse_content_tag_change
  AFTER INSERT OR DELETE ON pulse_content_tags
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_content_tag_change();

-- =====================================================
-- SECTION 9: Follower Count Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_on_connection_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta INTEGER;
BEGIN
  v_delta := CASE TG_OP WHEN 'INSERT' THEN 1 ELSE -1 END;

  -- Update follower count for the followed user
  UPDATE pulse_provider_stats
  SET follower_count = GREATEST(0, follower_count + v_delta),
      updated_at = NOW()
  WHERE provider_id = CASE TG_OP WHEN 'DELETE' THEN OLD.following_id ELSE NEW.following_id END;

  -- Update following count for the follower
  UPDATE pulse_provider_stats
  SET following_count = GREATEST(0, following_count + v_delta),
      updated_at = NOW()
  WHERE provider_id = CASE TG_OP WHEN 'DELETE' THEN OLD.follower_id ELSE NEW.follower_id END;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_connection_change ON pulse_connections;
CREATE TRIGGER trg_pulse_connection_change
  AFTER INSERT OR DELETE ON pulse_connections
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_connection_change();

-- =====================================================
-- SECTION 10: Prevent Self-Engagement Trigger
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_prevent_self_engagement()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_content_owner_id UUID;
BEGIN
  SELECT provider_id INTO v_content_owner_id
  FROM pulse_content
  WHERE id = NEW.content_id;

  IF v_content_owner_id = NEW.provider_id THEN
    RAISE EXCEPTION 'Cannot engage with your own content';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pulse_prevent_self_engagement ON pulse_engagements;
CREATE TRIGGER trg_pulse_prevent_self_engagement
  BEFORE INSERT ON pulse_engagements
  FOR EACH ROW
  EXECUTE FUNCTION pulse_prevent_self_engagement();

-- =====================================================
-- SECTION 11: Storage Bucket for Pulse Media
-- =====================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pulse-media',
  'pulse-media',
  true,
  524288000, -- 500MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Anyone can view public content media
CREATE POLICY "Public pulse media is viewable by everyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'pulse-media');

-- Storage RLS: Authenticated users can upload to their own folder
CREATE POLICY "Users can upload to their pulse folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'pulse-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: Users can update their own files
CREATE POLICY "Users can update their pulse files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'pulse-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Storage RLS: Users can delete their own files
CREATE POLICY "Users can delete their pulse files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'pulse-media' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- =====================================================
-- SECTION 12: Feed Ranking Function
-- =====================================================

CREATE OR REPLACE FUNCTION public.pulse_get_ranked_feed(
  p_viewer_id UUID DEFAULT NULL,
  p_industry_segment_id UUID DEFAULT NULL,
  p_content_type pulse_content_type DEFAULT NULL,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  provider_id UUID,
  content_type pulse_content_type,
  title TEXT,
  caption TEXT,
  headline TEXT,
  key_insight TEXT,
  media_urls JSONB,
  cover_image_url TEXT,
  fire_count INTEGER,
  comment_count INTEGER,
  gold_count INTEGER,
  save_count INTEGER,
  created_at TIMESTAMPTZ,
  ranking_score FLOAT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.provider_id,
    c.content_type,
    c.title,
    c.caption,
    c.headline,
    c.key_insight,
    c.media_urls,
    c.cover_image_url,
    c.fire_count,
    c.comment_count,
    c.gold_count,
    c.save_count,
    c.created_at,
    -- Ranking: weighted engagement + recency decay + visibility boost
    (
      (c.fire_count * 1.0) +
      (c.comment_count * 3.0) +
      (c.gold_count * 10.0) +
      (c.save_count * 5.0)
    ) * (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - c.created_at)) / 86400.0))
      * COALESCE(c.visibility_boost_multiplier, 1.0)
      * CASE WHEN c.visibility_boost_expires_at > NOW() THEN 1.0 ELSE 
          CASE WHEN c.visibility_boost_multiplier > 1 THEN 0.5 ELSE 1.0 END
        END
    AS ranking_score
  FROM pulse_content c
  WHERE c.content_status = 'published'
    AND c.is_deleted = FALSE
    AND (p_industry_segment_id IS NULL OR c.industry_segment_id = p_industry_segment_id)
    AND (p_content_type IS NULL OR c.content_type = p_content_type)
  ORDER BY ranking_score DESC, c.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;