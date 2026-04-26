-- Phase 9 v4 — Prompt 2: Governance flags + safe BIU trigger
-- 1. Add fc_review_required column (nullable so trigger can derive default when unset)
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS fc_review_required boolean;

-- 2. Make lc_review_required nullable so NULL means "derive from governance mode"
--    Existing rows keep their current value (true/false); only future NULL writes trigger derivation.
ALTER TABLE public.challenges
  ALTER COLUMN lc_review_required DROP NOT NULL,
  ALTER COLUMN lc_review_required DROP DEFAULT;

-- 3. BIU trigger: defaults review flags from effective governance mode when caller leaves them NULL.
--    NEVER overwrites an explicit caller-provided value, even when governance mode flips.
CREATE OR REPLACE FUNCTION public.set_challenge_review_flags_default()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_effective_mode text;
BEGIN
  -- Effective governance mode: challenge override wins over org-inherited profile
  v_effective_mode := UPPER(COALESCE(NEW.governance_mode_override, NEW.governance_profile, 'STRUCTURED'));

  IF TG_OP = 'INSERT' THEN
    IF NEW.lc_review_required IS NULL THEN
      NEW.lc_review_required := (v_effective_mode = 'CONTROLLED');
    END IF;
    IF NEW.fc_review_required IS NULL THEN
      NEW.fc_review_required := (v_effective_mode = 'CONTROLLED');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Preserve explicit prior value when caller doesn't touch the column
    NEW.lc_review_required := COALESCE(NEW.lc_review_required, OLD.lc_review_required, (v_effective_mode = 'CONTROLLED'));
    NEW.fc_review_required := COALESCE(NEW.fc_review_required, OLD.fc_review_required, (v_effective_mode = 'CONTROLLED'));
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_challenges_set_review_flags_biu ON public.challenges;
CREATE TRIGGER trg_challenges_set_review_flags_biu
  BEFORE INSERT OR UPDATE ON public.challenges
  FOR EACH ROW
  EXECUTE FUNCTION public.set_challenge_review_flags_default();

-- 4. Backfill fc_review_required for existing rows based on current effective governance mode.
--    Existing lc_review_required values are preserved (do not touch).
UPDATE public.challenges
SET fc_review_required = (UPPER(COALESCE(governance_mode_override, governance_profile, 'STRUCTURED')) = 'CONTROLLED')
WHERE fc_review_required IS NULL;