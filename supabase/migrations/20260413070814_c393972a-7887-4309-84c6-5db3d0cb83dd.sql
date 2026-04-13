-- ============================================================
-- CHUNK 1: Extend existing tables for Provider Enrollment Revamp
-- All additive columns — zero breaking changes
-- ============================================================

-- 1. solution_providers — profile extension
ALTER TABLE public.solution_providers
  ADD COLUMN IF NOT EXISTS bio_tagline TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS portfolio_url TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS availability TEXT
    CHECK (availability IN ('full_time', 'part_time', 'weekends', 'project_based', 'not_available')),
  ADD COLUMN IF NOT EXISTS provider_level INTEGER NOT NULL DEFAULT 1
    CHECK (provider_level BETWEEN 1 AND 10),
  ADD COLUMN IF NOT EXISTS profile_strength INTEGER NOT NULL DEFAULT 20
    CHECK (profile_strength BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_solution_providers_provider_level
  ON public.solution_providers (provider_level);
CREATE INDEX IF NOT EXISTS idx_solution_providers_profile_strength
  ON public.solution_providers (profile_strength);
CREATE INDEX IF NOT EXISTS idx_solution_providers_availability
  ON public.solution_providers (availability);

-- 2. challenges — access gating + reward
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS access_type TEXT NOT NULL DEFAULT 'open_all'
    CHECK (access_type IN ('open_all', 'certified_only', 'star_gated', 'invite_only')),
  ADD COLUMN IF NOT EXISTS min_star_tier INTEGER NOT NULL DEFAULT 0
    CHECK (min_star_tier BETWEEN 0 AND 3),
  ADD COLUMN IF NOT EXISTS reward_amount NUMERIC(12,2);

-- Index for access filtering
CREATE INDEX IF NOT EXISTS idx_challenges_access_type
  ON public.challenges (access_type);

-- 3. challenge_submissions — classification
ALTER TABLE public.challenge_submissions
  ADD COLUMN IF NOT EXISTS submission_type TEXT NOT NULL DEFAULT 'abstract'
    CHECK (submission_type IN ('abstract', 'full', 'prototype', 'presentation')),
  ADD COLUMN IF NOT EXISTS award_tier TEXT
    CHECK (award_tier IS NULL OR award_tier IN ('proven', 'acclaimed', 'eminent')),
  ADD COLUMN IF NOT EXISTS complexity_level_at_submission TEXT;

-- 4. solution_provider_invitations — status lifecycle
ALTER TABLE public.solution_provider_invitations
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'revoked'));