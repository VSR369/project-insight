-- Canonical status validator for challenge_legal_docs.
-- The live trigger on this table points to trg_challenge_legal_docs_validate(),
-- so we update THAT function (not the duplicate enforce_legal_doc_status one)
-- to allow the SOURCE_DOC + UNIFIED_SPA lifecycle statuses introduced by the
-- unified Pass 3 flow. Keeping a single source of truth prevents future drift.

CREATE OR REPLACE FUNCTION public.trg_challenge_legal_docs_validate()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN (
    -- Legacy multi-doc lifecycle
    'ATTACHED', 'TRIGGERED', 'SIGNED', 'EXPIRED', 'ai_suggested',
    -- Unified Pass 3 source-doc + unified-doc lifecycle
    'uploaded', 'organized', 'accepted', 'APPROVED'
  ) THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;

  RETURN NEW;
END;
$$;