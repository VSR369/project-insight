
-- Add scroll_confirmed column to legal_acceptance_ledger per BR-LGL-007
ALTER TABLE public.legal_acceptance_ledger
  ADD COLUMN IF NOT EXISTS scroll_confirmed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.legal_acceptance_ledger.scroll_confirmed
  IS 'Whether user scrolled to bottom of document before accepting (BR-LGL-007)';
