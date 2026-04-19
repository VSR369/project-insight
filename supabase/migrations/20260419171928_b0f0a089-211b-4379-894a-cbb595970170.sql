-- Sprint 6B: Schema additions for tier-based legal config + creator comments

-- 1. AI legal review config: tier complexity + token/effort overrides
ALTER TABLE public.ai_legal_review_config
  ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 16384,
  ADD COLUMN IF NOT EXISTS reasoning_effort TEXT DEFAULT 'high',
  ADD COLUMN IF NOT EXISTS tier_complexity TEXT DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS section_instructions_by_tier JSONB DEFAULT '{}'::jsonb;

-- Add CHECK constraints (drop first if they exist for idempotency)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_legal_review_config_reasoning_effort'
  ) THEN
    ALTER TABLE public.ai_legal_review_config
      ADD CONSTRAINT chk_ai_legal_review_config_reasoning_effort
      CHECK (reasoning_effort IN ('low', 'medium', 'high'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_ai_legal_review_config_tier_complexity'
  ) THEN
    ALTER TABLE public.ai_legal_review_config
      ADD CONSTRAINT chk_ai_legal_review_config_tier_complexity
      CHECK (tier_complexity IN ('standard', 'premium', 'enterprise'));
  END IF;
END $$;

-- 2. Creator comments on approved legal docs (read-only sections)
ALTER TABLE public.challenge_legal_docs
  ADD COLUMN IF NOT EXISTS creator_comments TEXT;

-- 3. Creator comments on FC escrow (read-only for Creator)
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS creator_escrow_comments TEXT;