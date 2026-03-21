CREATE OR REPLACE FUNCTION public.trg_challenge_legal_docs_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.tier NOT IN ('TIER_1','TIER_2') THEN
    RAISE EXCEPTION 'Invalid tier: %. Must be TIER_1 or TIER_2', NEW.tier;
  END IF;

  IF NEW.status IS NOT NULL AND NEW.status NOT IN ('ATTACHED','TRIGGERED','SIGNED','EXPIRED','ai_suggested') THEN
    RAISE EXCEPTION 'Invalid status: %. Must be ATTACHED, TRIGGERED, SIGNED, EXPIRED, or ai_suggested', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;