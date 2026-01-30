-- =====================================================
-- PulsePages (Pulse Card) - Collaborative Knowledge System
-- Phase 1: Create all 8 tables with RLS, indexes, and functions
-- =====================================================

-- ===========================================
-- Table 1: pulse_card_topics (Topic Categories)
-- ===========================================
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

-- RLS for topics
ALTER TABLE public.pulse_card_topics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active topics" ON public.pulse_card_topics
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage topics" ON public.pulse_card_topics
  FOR ALL USING (public.has_role(auth.uid(), 'platform_admin'));

-- ===========================================
-- Table 2: pulse_cards (Core Card Entity)
-- ===========================================
CREATE TABLE public.pulse_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES public.pulse_card_topics(id) NOT NULL,
  seed_creator_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  current_featured_layer_id UUID, -- FK added after layers table
  
  -- Status: active | flagged | archived
  status VARCHAR(20) DEFAULT 'active' NOT NULL,
  
  -- Metrics
  view_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  build_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  archived_by UUID REFERENCES auth.users(id),
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_card_status CHECK (status IN ('active', 'flagged', 'archived'))
);

-- RLS for cards
ALTER TABLE public.pulse_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active cards visible to authenticated" ON public.pulse_cards
  FOR SELECT TO authenticated 
  USING (status = 'active' OR public.has_role(auth.uid(), 'platform_admin'));

CREATE POLICY "Providers can create cards" ON public.pulse_cards
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = seed_creator_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Creators can update own cards" ON public.pulse_cards
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = seed_creator_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_admin')
  );

-- Indexes for cards
CREATE INDEX idx_pulse_cards_topic_status ON public.pulse_cards(topic_id, status);
CREATE INDEX idx_pulse_cards_creator ON public.pulse_cards(seed_creator_id);
CREATE INDEX idx_pulse_cards_status_created ON public.pulse_cards(status, created_at DESC);

-- ===========================================
-- Table 3: pulse_card_layers (Card Versions/Builds)
-- ===========================================
CREATE TABLE public.pulse_card_layers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID REFERENCES public.pulse_cards(id) ON DELETE CASCADE NOT NULL,
  creator_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  
  -- Content (280 chars max + 1 media)
  content_text VARCHAR(280) NOT NULL,
  media_url TEXT,
  media_type VARCHAR(20),
  
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
  voting_ends_at TIMESTAMPTZ,
  
  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_layer_status CHECK (status IN ('active', 'flagged', 'archived')),
  CONSTRAINT valid_media_type CHECK (media_type IS NULL OR media_type IN ('image', 'video'))
);

-- Add FK for featured layer on cards
ALTER TABLE public.pulse_cards 
  ADD CONSTRAINT fk_pulse_cards_featured_layer 
  FOREIGN KEY (current_featured_layer_id) 
  REFERENCES public.pulse_card_layers(id);

-- RLS for layers
ALTER TABLE public.pulse_card_layers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active layers visible to authenticated" ON public.pulse_card_layers
  FOR SELECT TO authenticated 
  USING (
    status = 'active' 
    OR EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = creator_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "Providers can create layers" ON public.pulse_card_layers
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = creator_id AND sp.user_id = auth.uid())
  );

CREATE POLICY "Creators can update own layers" ON public.pulse_card_layers
  FOR UPDATE TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = creator_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_admin')
  );

-- Indexes for layers
CREATE INDEX idx_pulse_layers_card_featured ON public.pulse_card_layers(card_id, is_featured);
CREATE INDEX idx_pulse_layers_votes ON public.pulse_card_layers(vote_score DESC);
CREATE INDEX idx_pulse_layers_creator ON public.pulse_card_layers(creator_id);
CREATE INDEX idx_pulse_layers_status ON public.pulse_card_layers(status, created_at DESC);

-- ===========================================
-- Table 4: pulse_card_votes (Layer Voting)
-- ===========================================
CREATE TABLE public.pulse_card_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  layer_id UUID REFERENCES public.pulse_card_layers(id) ON DELETE CASCADE NOT NULL,
  voter_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  vote_type VARCHAR(10) NOT NULL,
  vote_weight INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_vote_type CHECK (vote_type IN ('up', 'down')),
  UNIQUE(layer_id, voter_id)
);

-- RLS for votes
ALTER TABLE public.pulse_card_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all votes" ON public.pulse_card_votes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users manage own votes" ON public.pulse_card_votes
  FOR ALL TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = voter_id AND sp.user_id = auth.uid())
  );

-- Index for votes
CREATE INDEX idx_pulse_votes_layer ON public.pulse_card_votes(layer_id);
CREATE INDEX idx_pulse_votes_voter ON public.pulse_card_votes(voter_id);

-- ===========================================
-- Table 5: pulse_cards_reputation_log (Reputation Tracking)
-- ===========================================
CREATE TABLE public.pulse_cards_reputation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  points_delta INTEGER NOT NULL,
  reason TEXT,
  reference_type VARCHAR(50),
  reference_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for reputation log
ALTER TABLE public.pulse_cards_reputation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own reputation" ON public.pulse_cards_reputation_log
  FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = provider_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "System can insert reputation logs" ON public.pulse_cards_reputation_log
  FOR INSERT TO authenticated 
  WITH CHECK (true);

-- Index for reputation
CREATE INDEX idx_pulse_reputation_provider ON public.pulse_cards_reputation_log(provider_id, created_at);

-- ===========================================
-- Table 6: pulse_card_flags (Content Flagging)
-- ===========================================
CREATE TABLE public.pulse_card_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  reporter_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  flag_type VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending' NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_target_type CHECK (target_type IN ('card', 'layer')),
  CONSTRAINT valid_flag_type CHECK (flag_type IN ('spam', 'false_claim', 'uncited', 'unconstructive', 'other')),
  CONSTRAINT valid_flag_status CHECK (status IN ('pending', 'upheld', 'rejected'))
);

-- RLS for flags
ALTER TABLE public.pulse_card_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own flags" ON public.pulse_card_flags
  FOR SELECT TO authenticated 
  USING (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = reporter_id AND sp.user_id = auth.uid())
    OR public.has_role(auth.uid(), 'platform_admin')
  );

CREATE POLICY "Users can create flags" ON public.pulse_card_flags
  FOR INSERT TO authenticated 
  WITH CHECK (
    EXISTS (SELECT 1 FROM solution_providers sp WHERE sp.id = reporter_id AND sp.user_id = auth.uid())
  );

-- Index for flags
CREATE INDEX idx_pulse_flags_status ON public.pulse_card_flags(status, created_at);
CREATE INDEX idx_pulse_flags_target ON public.pulse_card_flags(target_type, target_id);

-- ===========================================
-- Table 7: pulse_trust_council (Weekly Rotating Council)
-- ===========================================
CREATE TABLE public.pulse_trust_council (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES public.solution_providers(id) NOT NULL,
  week_start DATE NOT NULL,
  week_end DATE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(provider_id, week_start)
);

-- RLS for trust council
ALTER TABLE public.pulse_trust_council ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read council members" ON public.pulse_trust_council
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage council" ON public.pulse_trust_council
  FOR ALL TO authenticated 
  USING (public.has_role(auth.uid(), 'platform_admin'));

-- Index for council
CREATE INDEX idx_pulse_council_active ON public.pulse_trust_council(is_active, week_start);

-- ===========================================
-- Table 8: pulse_moderation_actions (Moderation History)
-- ===========================================
CREATE TABLE public.pulse_moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_id UUID REFERENCES public.pulse_card_flags(id),
  target_type VARCHAR(20) NOT NULL,
  target_id UUID NOT NULL,
  action_type VARCHAR(50) NOT NULL,
  council_votes JSONB DEFAULT '{}'::jsonb,
  outcome VARCHAR(20) NOT NULL,
  reasoning TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  CONSTRAINT valid_action_type CHECK (action_type IN ('warning', 'mute_7d', 'archive', 'strike')),
  CONSTRAINT valid_outcome CHECK (outcome IN ('upheld', 'rejected'))
);

-- RLS for moderation actions
ALTER TABLE public.pulse_moderation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read moderation actions" ON public.pulse_moderation_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Council and admins can create actions" ON public.pulse_moderation_actions
  FOR INSERT TO authenticated 
  WITH CHECK (public.has_role(auth.uid(), 'platform_admin'));

-- Index for moderation
CREATE INDEX idx_pulse_moderation_target ON public.pulse_moderation_actions(target_type, target_id);

-- ===========================================
-- Function: Calculate provider cards reputation
-- ===========================================
CREATE OR REPLACE FUNCTION public.pulse_cards_get_reputation(p_provider_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(points_delta), 0)::INTEGER
  FROM pulse_cards_reputation_log
  WHERE provider_id = p_provider_id;
$$;

-- ===========================================
-- Function: Award cards reputation points
-- ===========================================
CREATE OR REPLACE FUNCTION public.pulse_cards_award_reputation(
  p_provider_id UUID,
  p_action_type VARCHAR(50),
  p_points INTEGER,
  p_reason TEXT DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO pulse_cards_reputation_log (
    provider_id,
    action_type,
    points_delta,
    reason,
    reference_type,
    reference_id
  ) VALUES (
    p_provider_id,
    p_action_type,
    p_points,
    p_reason,
    p_reference_type,
    p_reference_id
  );
  RETURN TRUE;
END;
$$;

-- ===========================================
-- Trigger: Auto-update card build count when layer added
-- ===========================================
CREATE OR REPLACE FUNCTION public.pulse_cards_update_build_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pulse_cards 
    SET build_count = build_count + 1, updated_at = NOW()
    WHERE id = NEW.card_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pulse_cards 
    SET build_count = GREATEST(0, build_count - 1), updated_at = NOW()
    WHERE id = OLD.card_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_pulse_cards_build_count
  AFTER INSERT OR DELETE ON public.pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION public.pulse_cards_update_build_count();

-- ===========================================
-- Trigger: Update vote counts on layers
-- ===========================================
CREATE OR REPLACE FUNCTION public.pulse_cards_update_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.vote_type = 'up' THEN
      UPDATE pulse_card_layers 
      SET votes_up = votes_up + NEW.vote_weight, updated_at = NOW()
      WHERE id = NEW.layer_id;
    ELSE
      UPDATE pulse_card_layers 
      SET votes_down = votes_down + NEW.vote_weight, updated_at = NOW()
      WHERE id = NEW.layer_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.vote_type = 'up' THEN
      UPDATE pulse_card_layers 
      SET votes_up = GREATEST(0, votes_up - OLD.vote_weight), updated_at = NOW()
      WHERE id = OLD.layer_id;
    ELSE
      UPDATE pulse_card_layers 
      SET votes_down = GREATEST(0, votes_down - OLD.vote_weight), updated_at = NOW()
      WHERE id = OLD.layer_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.vote_type != NEW.vote_type THEN
    -- Vote changed direction
    IF NEW.vote_type = 'up' THEN
      UPDATE pulse_card_layers 
      SET votes_up = votes_up + NEW.vote_weight,
          votes_down = GREATEST(0, votes_down - OLD.vote_weight),
          updated_at = NOW()
      WHERE id = NEW.layer_id;
    ELSE
      UPDATE pulse_card_layers 
      SET votes_down = votes_down + NEW.vote_weight,
          votes_up = GREATEST(0, votes_up - OLD.vote_weight),
          updated_at = NOW()
      WHERE id = NEW.layer_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_pulse_cards_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON public.pulse_card_votes
  FOR EACH ROW
  EXECUTE FUNCTION public.pulse_cards_update_vote_counts();

-- ===========================================
-- Trigger: Award reputation when layer is created (build received)
-- ===========================================
CREATE OR REPLACE FUNCTION public.pulse_cards_layer_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_creator_id UUID;
BEGIN
  -- Get the original card creator
  SELECT seed_creator_id INTO v_card_creator_id
  FROM pulse_cards
  WHERE id = NEW.card_id;
  
  -- Award 5 points to card creator for receiving a build
  IF v_card_creator_id IS NOT NULL AND v_card_creator_id != NEW.creator_id THEN
    PERFORM pulse_cards_award_reputation(
      v_card_creator_id,
      'card_build_received',
      5,
      'Your card received a build',
      'layer',
      NEW.id
    );
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_pulse_cards_layer_reputation
  AFTER INSERT ON public.pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION public.pulse_cards_layer_reputation();

-- ===========================================
-- Update topic card count trigger
-- ===========================================
CREATE OR REPLACE FUNCTION public.pulse_cards_update_topic_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE pulse_card_topics 
    SET card_count = card_count + 1, updated_at = NOW()
    WHERE id = NEW.topic_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE pulse_card_topics 
    SET card_count = GREATEST(0, card_count - 1), updated_at = NOW()
    WHERE id = OLD.topic_id;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_pulse_cards_topic_count
  AFTER INSERT OR DELETE ON public.pulse_cards
  FOR EACH ROW
  EXECUTE FUNCTION public.pulse_cards_update_topic_count();