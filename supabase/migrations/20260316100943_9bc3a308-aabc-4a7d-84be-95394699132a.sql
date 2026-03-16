
-- =====================================================
-- Migration: Solver Eligibility Schema
-- Creates md_solver_eligibility, challenge_submissions,
-- and adds solver_eligibility_id FK to challenges
-- =====================================================

-- 1. Master data table: md_solver_eligibility
CREATE TABLE public.md_solver_eligibility (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  description TEXT,
  requires_auth BOOLEAN NOT NULL DEFAULT true,
  requires_provider_record BOOLEAN NOT NULL DEFAULT true,
  requires_certification BOOLEAN NOT NULL DEFAULT false,
  min_star_rating INTEGER,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_md_solver_eligibility_code ON public.md_solver_eligibility(code);
CREATE INDEX idx_md_solver_eligibility_active ON public.md_solver_eligibility(is_active, display_order);

-- RLS: public read for authenticated users (master data)
ALTER TABLE public.md_solver_eligibility ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active solver eligibility"
  ON public.md_solver_eligibility
  FOR SELECT
  USING (is_active = true);

-- 2. Seed the 8 categories
INSERT INTO public.md_solver_eligibility (code, label, description, requires_auth, requires_provider_record, requires_certification, min_star_rating, display_order) VALUES
  ('certified_basic', 'Certified Basic', 'Only Basic (⭐) or higher certified solution providers can participate', true, true, true, 1, 10),
  ('certified_competent', 'Certified Competent', 'Only Competent (⭐⭐) or higher certified solution providers can participate', true, true, true, 2, 20),
  ('certified_expert', 'Certified Expert', 'Only Expert (⭐⭐⭐) certified solution providers can participate', true, true, true, 3, 30),
  ('registered', 'Registered', 'Any registered provider with basic information can participate — no certification required', true, true, false, NULL, 40),
  ('expert_invitee', 'Expert (Invitee)', 'VIP Expert invitees who are auto-certified can participate', true, true, false, NULL, 50),
  ('signed_in', 'Signed In', 'Any authenticated user can participate — no provider registration needed. Can also engage in Pulse discussions', true, false, false, NULL, 60),
  ('open_community', 'Open Community', 'Anyone can participate — citizens, students, public. No login required. Contact details collected for prize/certificate fulfillment', false, false, false, NULL, 70),
  ('hybrid', 'Hybrid', 'Curated certified experts get priority slots, plus open community can also submit solutions', false, false, false, NULL, 80);

-- 3. Add solver_eligibility_id FK to challenges
ALTER TABLE public.challenges
  ADD COLUMN solver_eligibility_id UUID REFERENCES public.md_solver_eligibility(id);

CREATE INDEX idx_challenges_solver_eligibility ON public.challenges(solver_eligibility_id);

-- 4. Challenge submissions table (unified for all solver categories)
CREATE TABLE public.challenge_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.seeker_organizations(id),
  challenge_id UUID NOT NULL REFERENCES public.challenges(id),
  user_id UUID REFERENCES auth.users(id),
  provider_id UUID,
  solver_eligibility_code TEXT NOT NULL,
  submitter_name TEXT NOT NULL,
  submitter_email TEXT NOT NULL,
  submitter_phone TEXT,
  submission_text TEXT,
  submission_files JSONB DEFAULT '[]'::jsonb,
  payment_details JSONB,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'accepted', 'rejected', 'withdrawn')),
  prize_status TEXT CHECK (prize_status IN ('pending', 'awarded', 'dispatched', 'not_applicable')),
  email_verified BOOLEAN NOT NULL DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for challenge_submissions
CREATE INDEX idx_challenge_submissions_challenge ON public.challenge_submissions(challenge_id);
CREATE INDEX idx_challenge_submissions_tenant ON public.challenge_submissions(tenant_id);
CREATE INDEX idx_challenge_submissions_user ON public.challenge_submissions(user_id);
CREATE INDEX idx_challenge_submissions_status ON public.challenge_submissions(challenge_id, status);
CREATE INDEX idx_challenge_submissions_not_deleted ON public.challenge_submissions(challenge_id, is_deleted) WHERE is_deleted = false;

-- RLS for challenge_submissions
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert their own submissions
CREATE POLICY "Users can insert own submissions"
  ON public.challenge_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can read their own submissions
CREATE POLICY "Users can read own submissions"
  ON public.challenge_submissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() AND is_deleted = false);

-- Anonymous users can insert (for open community)
CREATE POLICY "Anonymous can insert open submissions"
  ON public.challenge_submissions
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND solver_eligibility_code = 'open_community');
