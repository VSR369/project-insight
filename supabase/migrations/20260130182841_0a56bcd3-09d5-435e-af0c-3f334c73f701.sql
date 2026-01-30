-- =====================================================
-- Phase 1: Add compilation cache fields to pulse_cards
-- Supports AI-synthesized narrative caching for dual-view UX
-- =====================================================

-- Add compilation fields
ALTER TABLE pulse_cards
  ADD COLUMN IF NOT EXISTS compiled_narrative TEXT,
  ADD COLUMN IF NOT EXISTS compiled_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS compilation_stale BOOLEAN NOT NULL DEFAULT false;

-- Add index for stale narrative queries
CREATE INDEX IF NOT EXISTS idx_pulse_cards_compilation_stale 
  ON pulse_cards(compilation_stale) 
  WHERE compilation_stale = true;

-- Create trigger function to mark narrative stale when new layer is added
CREATE OR REPLACE FUNCTION pulse_cards_mark_narrative_stale()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark the parent card's narrative as stale when a new layer is added
  UPDATE pulse_cards
  SET compilation_stale = true,
      updated_at = NOW()
  WHERE id = NEW.card_id
    AND (compiled_narrative IS NOT NULL OR compiled_at IS NOT NULL);
  
  RETURN NEW;
END;
$$;

-- Create trigger on pulse_card_layers
DROP TRIGGER IF EXISTS trigger_mark_narrative_stale ON pulse_card_layers;
CREATE TRIGGER trigger_mark_narrative_stale
  AFTER INSERT ON pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION pulse_cards_mark_narrative_stale();

-- Also mark stale when a layer is updated (content changed) or featured status changes
CREATE OR REPLACE FUNCTION pulse_cards_mark_narrative_stale_on_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only mark stale if content or featured status changed
  IF OLD.content_text IS DISTINCT FROM NEW.content_text 
     OR OLD.is_featured IS DISTINCT FROM NEW.is_featured THEN
    UPDATE pulse_cards
    SET compilation_stale = true,
        updated_at = NOW()
    WHERE id = NEW.card_id
      AND (compiled_narrative IS NOT NULL OR compiled_at IS NOT NULL);
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_mark_narrative_stale_on_update ON pulse_card_layers;
CREATE TRIGGER trigger_mark_narrative_stale_on_update
  AFTER UPDATE ON pulse_card_layers
  FOR EACH ROW
  EXECUTE FUNCTION pulse_cards_mark_narrative_stale_on_update();