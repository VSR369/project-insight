-- =====================================================
-- PulsePages Phase 2/3: Voting Window Auto-Feature Trigger
-- Automatically features the top-voted layer when voting window closes
-- =====================================================

-- Function to update featured layer when voting ends
CREATE OR REPLACE FUNCTION public.pulse_cards_auto_feature_layer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_card_id UUID;
  v_top_layer_id UUID;
  v_current_featured_id UUID;
BEGIN
  -- This trigger runs on UPDATE of pulse_card_layers
  -- We check if voting has just ended (voting_ends_at passed)
  
  -- Only process if this is a vote update (votes changed)
  IF OLD.votes_up = NEW.votes_up AND OLD.votes_down = NEW.votes_down THEN
    RETURN NEW;
  END IF;
  
  v_card_id := NEW.card_id;
  
  -- Get current featured layer
  SELECT current_featured_layer_id INTO v_current_featured_id
  FROM pulse_cards
  WHERE id = v_card_id;
  
  -- Find the layer with highest vote_score where voting has ended
  SELECT id INTO v_top_layer_id
  FROM pulse_card_layers
  WHERE card_id = v_card_id
    AND status = 'active'
    AND (voting_ends_at IS NULL OR voting_ends_at <= NOW())
  ORDER BY vote_score DESC, created_at ASC
  LIMIT 1;
  
  -- If top layer is different from current featured, update it
  IF v_top_layer_id IS NOT NULL AND v_top_layer_id != COALESCE(v_current_featured_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    -- Unfeature old layer
    UPDATE pulse_card_layers
    SET is_featured = FALSE
    WHERE card_id = v_card_id AND is_featured = TRUE;
    
    -- Feature new layer
    UPDATE pulse_card_layers
    SET is_featured = TRUE, featured_at = NOW()
    WHERE id = v_top_layer_id;
    
    -- Update card reference
    UPDATE pulse_cards
    SET current_featured_layer_id = v_top_layer_id
    WHERE id = v_card_id;
    
    -- Award reputation to new featured layer creator (only if different from old)
    IF v_current_featured_id IS NOT NULL THEN
      DECLARE
        v_creator_id UUID;
      BEGIN
        SELECT creator_id INTO v_creator_id
        FROM pulse_card_layers
        WHERE id = v_top_layer_id;
        
        IF v_creator_id IS NOT NULL THEN
          INSERT INTO pulse_cards_reputation_log (
            provider_id,
            action_type,
            points_delta,
            reason,
            reference_type,
            reference_id
          ) VALUES (
            v_creator_id,
            'layer_pinned',
            20,
            'Your layer became the featured version',
            'layer',
            v_top_layer_id
          );
        END IF;
      END;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on vote score changes
DROP TRIGGER IF EXISTS trg_pulse_cards_auto_feature ON pulse_card_layers;
CREATE TRIGGER trg_pulse_cards_auto_feature
  AFTER UPDATE OF votes_up, votes_down ON pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION pulse_cards_auto_feature_layer();

-- Function to increment build count when new layer is created
CREATE OR REPLACE FUNCTION public.pulse_cards_increment_build_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Increment build_count on the card
  UPDATE pulse_cards
  SET build_count = COALESCE(build_count, 0) + 1,
      updated_at = NOW()
  WHERE id = NEW.card_id;
  
  -- Award reputation to card seed creator (if different from layer creator)
  DECLARE
    v_seed_creator_id UUID;
  BEGIN
    SELECT seed_creator_id INTO v_seed_creator_id
    FROM pulse_cards
    WHERE id = NEW.card_id;
    
    IF v_seed_creator_id IS NOT NULL AND v_seed_creator_id != NEW.creator_id THEN
      INSERT INTO pulse_cards_reputation_log (
        provider_id,
        action_type,
        points_delta,
        reason,
        reference_type,
        reference_id
      ) VALUES (
        v_seed_creator_id,
        'card_build_received',
        5,
        'Your card received a build',
        'layer',
        NEW.id
      );
    END IF;
  END;
  
  RETURN NEW;
END;
$$;

-- Create trigger for build count
DROP TRIGGER IF EXISTS trg_pulse_cards_build_count ON pulse_card_layers;
CREATE TRIGGER trg_pulse_cards_build_count
  AFTER INSERT ON pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION pulse_cards_increment_build_count();

-- Function to update vote counts on layer when votes change
CREATE OR REPLACE FUNCTION public.pulse_cards_update_vote_counts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_up_count INTEGER;
  v_down_count INTEGER;
BEGIN
  -- Calculate new vote counts for the affected layer
  IF TG_OP = 'DELETE' THEN
    SELECT 
      COALESCE(SUM(CASE WHEN vote_type = 'up' THEN vote_weight ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN vote_type = 'down' THEN vote_weight ELSE 0 END), 0)
    INTO v_up_count, v_down_count
    FROM pulse_card_votes
    WHERE layer_id = OLD.layer_id;
    
    UPDATE pulse_card_layers
    SET votes_up = v_up_count,
        votes_down = v_down_count,
        updated_at = NOW()
    WHERE id = OLD.layer_id;
    
    RETURN OLD;
  ELSE
    SELECT 
      COALESCE(SUM(CASE WHEN vote_type = 'up' THEN vote_weight ELSE 0 END), 0),
      COALESCE(SUM(CASE WHEN vote_type = 'down' THEN vote_weight ELSE 0 END), 0)
    INTO v_up_count, v_down_count
    FROM pulse_card_votes
    WHERE layer_id = NEW.layer_id;
    
    UPDATE pulse_card_layers
    SET votes_up = v_up_count,
        votes_down = v_down_count,
        updated_at = NOW()
    WHERE id = NEW.layer_id;
    
    RETURN NEW;
  END IF;
END;
$$;

-- Create trigger for vote count updates
DROP TRIGGER IF EXISTS trg_pulse_cards_vote_counts ON pulse_card_votes;
CREATE TRIGGER trg_pulse_cards_vote_counts
  AFTER INSERT OR UPDATE OR DELETE ON pulse_card_votes
  FOR EACH ROW
  EXECUTE FUNCTION pulse_cards_update_vote_counts();

-- Add index for faster voting window queries
CREATE INDEX IF NOT EXISTS idx_pulse_layers_voting_ends 
  ON pulse_card_layers(card_id, voting_ends_at) 
  WHERE status = 'active';

-- Add index for faster reputation queries
CREATE INDEX IF NOT EXISTS idx_pulse_rep_log_provider 
  ON pulse_cards_reputation_log(provider_id, created_at DESC);