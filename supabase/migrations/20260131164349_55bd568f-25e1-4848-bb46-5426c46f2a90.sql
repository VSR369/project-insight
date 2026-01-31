-- =====================================================
-- Phase 1: Pulse Cards Social Integration
-- Add XP, engagements, streaks, and stats to Pulse Cards
-- =====================================================

-- 1.1 Add engagement columns to pulse_cards table
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS fire_count INTEGER DEFAULT 0;
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS gold_count INTEGER DEFAULT 0;
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS save_count INTEGER DEFAULT 0;
ALTER TABLE pulse_cards ADD COLUMN IF NOT EXISTS comment_count INTEGER DEFAULT 0;

-- 1.2 Create pulse_card_engagements table (uses pulse_engagement_type enum)
CREATE TABLE IF NOT EXISTS pulse_card_engagements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES pulse_cards(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES solution_providers(id),
  engagement_type pulse_engagement_type NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(card_id, provider_id, engagement_type)
);

-- 1.3 Add card stats to pulse_provider_stats
ALTER TABLE pulse_provider_stats 
  ADD COLUMN IF NOT EXISTS total_cards INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_layers INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_card_fire_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_card_gold_received INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_card_saves_received INTEGER DEFAULT 0;

-- 1.4 Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pulse_card_engagements_card_id ON pulse_card_engagements(card_id);
CREATE INDEX IF NOT EXISTS idx_pulse_card_engagements_provider_id ON pulse_card_engagements(provider_id);
CREATE INDEX IF NOT EXISTS idx_pulse_card_engagements_type ON pulse_card_engagements(engagement_type);

-- =====================================================
-- Phase 2: RLS Policies for Card Engagements
-- =====================================================

ALTER TABLE pulse_card_engagements ENABLE ROW LEVEL SECURITY;

-- Users can view all engagements (for counts)
CREATE POLICY "Users view card engagements"
ON pulse_card_engagements FOR SELECT
USING (true);

-- Users can insert their own engagements
CREATE POLICY "Users insert own card engagements"
ON pulse_card_engagements FOR INSERT
WITH CHECK (is_pulse_provider_owner(provider_id));

-- Users can update their own engagements
CREATE POLICY "Users update own card engagements"
ON pulse_card_engagements FOR UPDATE
USING (is_pulse_provider_owner(provider_id));

-- Users can delete their own engagements
CREATE POLICY "Users delete own card engagements"
ON pulse_card_engagements FOR DELETE
USING (is_pulse_provider_owner(provider_id));

-- =====================================================
-- Phase 3: Trigger for Card Creation XP
-- =====================================================

CREATE OR REPLACE FUNCTION pulse_on_card_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 75 XP for card creation
  PERFORM pulse_award_xp(
    NEW.creator_id,
    75,
    'card_created',
    NEW.id,
    'pulse_card',
    'Created Pulse Card'
  );

  -- Increment total_cards in stats
  UPDATE pulse_provider_stats
  SET total_cards = total_cards + 1,
      total_contributions = total_contributions + 1,
      updated_at = NOW()
  WHERE provider_id = NEW.creator_id;

  -- Update streak
  PERFORM pulse_update_streak(NEW.creator_id);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pulse_on_card_created ON pulse_cards;
CREATE TRIGGER trigger_pulse_on_card_created
  AFTER INSERT ON pulse_cards
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_card_created();

-- =====================================================
-- Phase 4: Trigger for Layer Creation XP
-- =====================================================

CREATE OR REPLACE FUNCTION pulse_on_layer_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Award 25 XP for layer creation
  PERFORM pulse_award_xp(
    NEW.creator_id,
    25,
    'layer_created',
    NEW.id,
    'pulse_card_layer',
    'Added layer to Pulse Card'
  );

  -- Increment total_layers in stats
  UPDATE pulse_provider_stats
  SET total_layers = total_layers + 1,
      total_contributions = total_contributions + 1,
      updated_at = NOW()
  WHERE provider_id = NEW.creator_id;

  -- Update streak
  PERFORM pulse_update_streak(NEW.creator_id);

  -- Increment build_count on the card
  UPDATE pulse_cards
  SET build_count = build_count + 1,
      updated_at = NOW()
  WHERE id = NEW.card_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pulse_on_layer_created ON pulse_card_layers;
CREATE TRIGGER trigger_pulse_on_layer_created
  AFTER INSERT ON pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_layer_created();

-- =====================================================
-- Phase 5: Trigger for Card Engagement Changes
-- =====================================================

CREATE OR REPLACE FUNCTION pulse_on_card_engagement_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_owner_id UUID;
  v_xp_amount INTEGER;
  v_count_column TEXT;
  v_stats_column TEXT;
  v_delta INTEGER;
BEGIN
  -- Determine delta based on operation
  IF TG_OP = 'INSERT' THEN
    v_delta := 1;
  ELSIF TG_OP = 'DELETE' THEN
    v_delta := -1;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.is_deleted AND NOT OLD.is_deleted THEN
      v_delta := -1;
    ELSIF NOT NEW.is_deleted AND OLD.is_deleted THEN
      v_delta := 1;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  -- Get the card owner
  IF TG_OP = 'DELETE' THEN
    SELECT creator_id INTO v_card_owner_id
    FROM pulse_cards WHERE id = OLD.card_id;
    
    v_count_column := CASE OLD.engagement_type::TEXT
      WHEN 'fire' THEN 'fire_count'
      WHEN 'gold' THEN 'gold_count'
      WHEN 'save' THEN 'save_count'
      WHEN 'bookmark' THEN NULL
    END;
    
    v_stats_column := CASE OLD.engagement_type::TEXT
      WHEN 'fire' THEN 'total_card_fire_received'
      WHEN 'gold' THEN 'total_card_gold_received'
      WHEN 'save' THEN 'total_card_saves_received'
      ELSE NULL
    END;
  ELSE
    SELECT creator_id INTO v_card_owner_id
    FROM pulse_cards WHERE id = NEW.card_id;
    
    v_count_column := CASE NEW.engagement_type::TEXT
      WHEN 'fire' THEN 'fire_count'
      WHEN 'gold' THEN 'gold_count'
      WHEN 'save' THEN 'save_count'
      WHEN 'bookmark' THEN NULL
    END;
    
    v_stats_column := CASE NEW.engagement_type::TEXT
      WHEN 'fire' THEN 'total_card_fire_received'
      WHEN 'gold' THEN 'total_card_gold_received'
      WHEN 'save' THEN 'total_card_saves_received'
      ELSE NULL
    END;
  END IF;

  -- Update card engagement count (except bookmarks)
  IF v_count_column IS NOT NULL THEN
    IF TG_OP = 'DELETE' THEN
      EXECUTE format(
        'UPDATE pulse_cards SET %I = GREATEST(0, %I + $1), updated_at = NOW() WHERE id = $2',
        v_count_column, v_count_column
      ) USING v_delta, OLD.card_id;
    ELSE
      EXECUTE format(
        'UPDATE pulse_cards SET %I = GREATEST(0, %I + $1), updated_at = NOW() WHERE id = $2',
        v_count_column, v_count_column
      ) USING v_delta, NEW.card_id;
    END IF;
  END IF;

  -- Award/revoke XP to card owner and update stats (not for bookmarks)
  IF v_card_owner_id IS NOT NULL AND v_count_column IS NOT NULL THEN
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
        v_card_owner_id,
        v_xp_amount,
        CASE WHEN v_delta > 0 THEN 'card_engagement_received' ELSE 'card_engagement_removed' END,
        COALESCE(NEW.card_id, OLD.card_id),
        COALESCE(NEW.engagement_type::TEXT, OLD.engagement_type::TEXT)
      );

      -- Update stats column
      IF v_stats_column IS NOT NULL THEN
        EXECUTE format(
          'UPDATE pulse_provider_stats SET %I = GREATEST(0, %I + $1), updated_at = NOW() WHERE provider_id = $2',
          v_stats_column, v_stats_column
        ) USING v_delta, v_card_owner_id;
      END IF;
    END IF;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_pulse_on_card_engagement_insert ON pulse_card_engagements;
DROP TRIGGER IF EXISTS trigger_pulse_on_card_engagement_update ON pulse_card_engagements;
DROP TRIGGER IF EXISTS trigger_pulse_on_card_engagement_delete ON pulse_card_engagements;

CREATE TRIGGER trigger_pulse_on_card_engagement_insert
  AFTER INSERT ON pulse_card_engagements
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_card_engagement_change();

CREATE TRIGGER trigger_pulse_on_card_engagement_update
  AFTER UPDATE ON pulse_card_engagements
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_card_engagement_change();

CREATE TRIGGER trigger_pulse_on_card_engagement_delete
  AFTER DELETE ON pulse_card_engagements
  FOR EACH ROW
  EXECUTE FUNCTION pulse_on_card_engagement_change();