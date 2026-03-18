-- Phase 3A: Add eligibility_model column to challenges (GAP-03)
-- Stores the formal BRD eligibility code: OC, DR, CE, IO, HY
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS eligibility_model TEXT
  CHECK (eligibility_model IS NULL OR eligibility_model IN ('OC', 'DR', 'CE', 'IO', 'HY'));

COMMENT ON COLUMN public.challenges.eligibility_model IS 'BRD §5.7.1 formal eligibility model code: OC=Open, DR=Direct Registered, CE=Curated Expert, IO=Invite Only, HY=Hybrid';

-- Backfill existing challenges based on current eligibility value
UPDATE public.challenges SET eligibility_model = 'OC' WHERE eligibility IN ('anyone', 'open') AND eligibility_model IS NULL;
UPDATE public.challenges SET eligibility_model = 'DR' WHERE eligibility IN ('registered_users') AND eligibility_model IS NULL;
UPDATE public.challenges SET eligibility_model = 'CE' WHERE eligibility IN ('curated_experts') AND eligibility_model IS NULL;
UPDATE public.challenges SET eligibility_model = 'IO' WHERE eligibility IN ('invited_experts', 'invite_only') AND eligibility_model IS NULL;