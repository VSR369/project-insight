
-- Update the validation trigger function to allow 'ai_suggested' status
CREATE OR REPLACE FUNCTION public.validate_challenge_legal_docs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Validate status
  IF NEW.status IS NOT NULL AND NEW.status NOT IN (
    'ATTACHED', 'TRIGGERED', 'SIGNED', 'EXPIRED', 'ai_suggested'
  ) THEN
    RAISE EXCEPTION 'Invalid status value: %. Allowed: ATTACHED, TRIGGERED, SIGNED, EXPIRED, ai_suggested', NEW.status;
  END IF;

  -- Validate tier
  IF NEW.tier IS NOT NULL AND NEW.tier NOT IN ('TIER_1', 'TIER_2') THEN
    RAISE EXCEPTION 'Invalid tier value: %. Allowed: TIER_1, TIER_2', NEW.tier;
  END IF;

  RETURN NEW;
END;
$$;
