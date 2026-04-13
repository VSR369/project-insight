
-- =============================================================
-- 1. vip_invitations
-- =============================================================
CREATE TABLE IF NOT EXISTS public.vip_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_name TEXT,
  token TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  star_tier INTEGER NOT NULL DEFAULT 3,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','expired','revoked')),
  invited_by UUID REFERENCES auth.users(id),
  accepted_by UUID REFERENCES auth.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.vip_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage vip_invitations"
  ON public.vip_invitations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admin_profiles
      WHERE id = auth.uid()
    )
  );

CREATE POLICY "Providers can view own invitations"
  ON public.vip_invitations FOR SELECT
  TO authenticated
  USING (
    lower(email) = lower(auth.jwt() ->> 'email')
  );

-- =============================================================
-- 2. provider_expertise
-- =============================================================
CREATE TABLE IF NOT EXISTS public.provider_expertise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  expertise_level_id UUID REFERENCES public.expertise_levels(id),
  industry_segment_id UUID REFERENCES public.industry_segments(id),
  geographies_served TEXT[] DEFAULT '{}',
  outcomes_delivered TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (provider_id)
);

ALTER TABLE public.provider_expertise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own expertise"
  ON public.provider_expertise FOR SELECT
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert own expertise"
  ON public.provider_expertise FOR INSERT
  TO authenticated
  WITH CHECK (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own expertise"
  ON public.provider_expertise FOR UPDATE
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

-- =============================================================
-- 3. provider_org_details
-- =============================================================
CREATE TABLE IF NOT EXISTS public.provider_org_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  participation_mode TEXT NOT NULL DEFAULT 'independent'
    CHECK (participation_mode IN ('independent','org_representative','self_accountable')),
  org_name TEXT,
  org_role TEXT,
  manager_name TEXT,
  manager_email TEXT,
  manager_approved BOOLEAN DEFAULT false,
  manager_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (provider_id)
);

ALTER TABLE public.provider_org_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view own org details"
  ON public.provider_org_details FOR SELECT
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert own org details"
  ON public.provider_org_details FOR INSERT
  TO authenticated
  WITH CHECK (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own org details"
  ON public.provider_org_details FOR UPDATE
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

-- =============================================================
-- 4. community_posts
-- =============================================================
CREATE TABLE IF NOT EXISTS public.community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  post_type TEXT NOT NULL DEFAULT 'post'
    CHECK (post_type IN ('post','article','peer_review','qa_answer')),
  title TEXT,
  content TEXT,
  helpful_votes INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published community posts"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (is_published = true AND is_deleted = false);

CREATE POLICY "Providers can view own posts"
  ON public.community_posts FOR SELECT
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can insert own posts"
  ON public.community_posts FOR INSERT
  TO authenticated
  WITH CHECK (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

CREATE POLICY "Providers can update own posts"
  ON public.community_posts FOR UPDATE
  TO authenticated
  USING (provider_id IN (
    SELECT id FROM public.solution_providers WHERE user_id = auth.uid()
  ));

-- =============================================================
-- 5. ALTER provider_performance_scores — add spec-aligned columns
-- =============================================================
ALTER TABLE public.provider_performance_scores
  ADD COLUMN IF NOT EXISTS score_community_engagement NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_abstracts_submitted NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_solution_quality NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_complexity_handled NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_win_achievement NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_knowledge_contrib NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS community_posts_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS community_helpful_votes INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS articles_written INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS peer_reviews_given INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS abstracts_submitted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS full_solutions_submitted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS solutions_accepted INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins_platinum INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins_gold INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins_silver INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS avg_challenge_complexity NUMERIC DEFAULT 0;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_vip_invitations_email ON public.vip_invitations (lower(email));
CREATE INDEX IF NOT EXISTS idx_vip_invitations_token ON public.vip_invitations (token);
CREATE INDEX IF NOT EXISTS idx_vip_invitations_status ON public.vip_invitations (status);
CREATE INDEX IF NOT EXISTS idx_provider_expertise_provider ON public.provider_expertise (provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_org_details_provider ON public.provider_org_details (provider_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_provider ON public.community_posts (provider_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_type ON public.community_posts (post_type);
CREATE INDEX IF NOT EXISTS idx_community_posts_published ON public.community_posts (is_published, is_deleted);
CREATE INDEX IF NOT EXISTS idx_perf_scores_date ON public.provider_performance_scores (provider_id, score_date DESC);
