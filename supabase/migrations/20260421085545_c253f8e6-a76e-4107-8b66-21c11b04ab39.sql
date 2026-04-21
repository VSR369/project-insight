CREATE OR REPLACE FUNCTION public.enforce_legal_doc_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN (
    'ATTACHED', 'TRIGGERED', 'SIGNED', 'EXPIRED', 'ai_suggested',
    'uploaded', 'organized', 'accepted', 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;