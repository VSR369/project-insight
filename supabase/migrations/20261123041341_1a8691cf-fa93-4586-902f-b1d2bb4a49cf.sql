CREATE OR REPLACE FUNCTION public.trg_challenge_legal_docs_validate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN (
    'ATTACHED', 'TRIGGERED', 'SIGNED', 'EXPIRED', 'ai_suggested',
    'uploaded', 'organized', 'accepted', 'APPROVED',
    'auto_accepted', 'pending_review'
  ) THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$function$;