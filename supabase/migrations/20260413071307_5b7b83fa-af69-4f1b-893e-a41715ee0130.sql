-- ============================================================
-- CHUNK 2: New tables for Provider Enrollment Revamp
-- ============================================================

-- 1. provider_certifications — multi-path certification
CREATE TABLE IF NOT EXISTS public.provider_certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  cert_path TEXT NOT NULL CHECK (cert_path IN ('experience', 'performance', 'vip')),
  star_tier INTEGER NOT NULL CHECK (star_tier BETWEEN 1 AND 3),
  cert_label TEXT NOT NULL CHECK (cert_label IN ('proven', 'acclaimed', 'eminent')),
  composite_score NUMERIC(5,2),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'superseded')),
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  awarded_by UUID REFERENCES auth.users(id),
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id),
  revocation_reason TEXT,
  enrollment_id UUID REFERENCES public.provider_industry_enrollments(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE (provider_id, cert_path, status) -- one active cert per path
);

ALTER TABLE public.provider_certifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_provider_certs_provider ON public.provider_certifications (provider_id);
CREATE INDEX idx_provider_certs_path_status ON public.provider_certifications (cert_path, status);
CREATE INDEX idx_provider_certs_star_tier ON public.provider_certifications (star_tier);

-- RLS: providers see own, admins see all
CREATE POLICY "Providers can view own certifications"
  ON public.provider_certifications FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.solution_providers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Only system can insert certifications"
  ON public.provider_certifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Only system can update certifications"
  ON public.provider_certifications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid())
  );

-- 2. provider_performance_scores — 6 dimensions + composite
CREATE TABLE IF NOT EXISTS public.provider_performance_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (quality_score BETWEEN 0 AND 100),
  consistency_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (consistency_score BETWEEN 0 AND 100),
  engagement_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (engagement_score BETWEEN 0 AND 100),
  responsiveness_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (responsiveness_score BETWEEN 0 AND 100),
  expertise_depth_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (expertise_depth_score BETWEEN 0 AND 100),
  community_impact_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (community_impact_score BETWEEN 0 AND 100),
  composite_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (composite_score BETWEEN 0 AND 100),
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  computation_metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  UNIQUE (provider_id) -- one row per provider, upserted nightly
);

ALTER TABLE public.provider_performance_scores ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_perf_scores_provider ON public.provider_performance_scores (provider_id);
CREATE INDEX idx_perf_scores_composite ON public.provider_performance_scores (composite_score DESC);

CREATE POLICY "Providers can view own performance scores"
  ON public.provider_performance_scores FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.solution_providers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid())
  );

-- 3. performance_score_weights — admin-configurable
CREATE TABLE IF NOT EXISTS public.performance_score_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension TEXT NOT NULL UNIQUE CHECK (dimension IN (
    'quality', 'consistency', 'engagement',
    'responsiveness', 'expertise_depth', 'community_impact'
  )),
  weight NUMERIC(4,3) NOT NULL CHECK (weight BETWEEN 0 AND 1),
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.performance_score_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read weights"
  ON public.performance_score_weights FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Only admins can update weights"
  ON public.performance_score_weights FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid())
  );

-- Seed default weights (sum = 1.0)
INSERT INTO public.performance_score_weights (dimension, weight, description) VALUES
  ('quality', 0.25, 'Quality of submissions and proof points'),
  ('consistency', 0.15, 'Regularity of platform activity'),
  ('engagement', 0.20, 'Participation in challenges and discussions'),
  ('responsiveness', 0.10, 'Response time and availability'),
  ('expertise_depth', 0.20, 'Depth of domain expertise demonstrated'),
  ('community_impact', 0.10, 'Contributions to community knowledge')
ON CONFLICT (dimension) DO NOTHING;

-- 4. provider_solution_types — junction
CREATE TABLE IF NOT EXISTS public.provider_solution_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  solution_type_id UUID NOT NULL REFERENCES public.md_solution_types(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE (provider_id, solution_type_id)
);

ALTER TABLE public.provider_solution_types ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_provider_solution_types_provider ON public.provider_solution_types (provider_id);
CREATE INDEX idx_provider_solution_types_type ON public.provider_solution_types (solution_type_id);

CREATE POLICY "Providers can view own solution types"
  ON public.provider_solution_types FOR SELECT
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.solution_providers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.platform_admin_profiles WHERE id = auth.uid())
  );

CREATE POLICY "Providers can manage own solution types"
  ON public.provider_solution_types FOR INSERT
  TO authenticated
  WITH CHECK (
    provider_id IN (SELECT id FROM public.solution_providers WHERE user_id = auth.uid())
  );

CREATE POLICY "Providers can delete own solution types"
  ON public.provider_solution_types FOR DELETE
  TO authenticated
  USING (
    provider_id IN (SELECT id FROM public.solution_providers WHERE user_id = auth.uid())
  );

-- 5. background_jobs — job queue
CREATE TABLE IF NOT EXISTS public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying')),
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_error TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.background_jobs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_bg_jobs_status_priority ON public.background_jobs (status, priority DESC, scheduled_at);
CREATE INDEX idx_bg_jobs_type ON public.background_jobs (job_type);

-- No public RLS — service_role only via edge functions

-- 6. platform_stats_cache — public homepage stats
CREATE TABLE IF NOT EXISTS public.platform_stats_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stat_key TEXT NOT NULL UNIQUE,
  stat_value NUMERIC NOT NULL DEFAULT 0,
  stat_label TEXT,
  display_order INTEGER DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ
);

ALTER TABLE public.platform_stats_cache ENABLE ROW LEVEL SECURITY;

-- Public read access for homepage stats
CREATE POLICY "Anyone can read platform stats"
  ON public.platform_stats_cache FOR SELECT
  USING (true);

-- 7. View: resolved certification (MAX star tier across all paths)
CREATE OR REPLACE VIEW public.vw_provider_resolved_cert AS
SELECT
  sp.id AS provider_id,
  sp.user_id,
  sp.first_name,
  sp.last_name,
  COALESCE(cert.max_star_tier, 0) AS resolved_star_tier,
  CASE
    WHEN cert.max_star_tier = 3 THEN 'eminent'
    WHEN cert.max_star_tier = 2 THEN 'acclaimed'
    WHEN cert.max_star_tier = 1 THEN 'proven'
    ELSE NULL
  END AS resolved_cert_label,
  cert.active_paths,
  cert.highest_composite
FROM public.solution_providers sp
LEFT JOIN LATERAL (
  SELECT
    MAX(pc.star_tier) AS max_star_tier,
    array_agg(DISTINCT pc.cert_path) AS active_paths,
    MAX(pc.composite_score) AS highest_composite
  FROM public.provider_certifications pc
  WHERE pc.provider_id = sp.id AND pc.status = 'active'
) cert ON true;

-- 8. Trigger: auto-certify VIP providers
CREATE OR REPLACE FUNCTION public.fn_auto_certify_vip()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only fire when lifecycle_status changes to 'certified' and registration_mode is 'invitation'
  IF NEW.lifecycle_status = 'certified'
     AND NEW.registration_mode = 'invitation'
     AND (OLD.lifecycle_status IS DISTINCT FROM 'certified')
  THEN
    -- Check if invitation was vip_expert
    IF EXISTS (
      SELECT 1 FROM public.solution_provider_invitations
      WHERE id = NEW.invitation_id AND invitation_type = 'vip_expert'
    ) THEN
      -- Insert VIP certification if not already exists
      INSERT INTO public.provider_certifications (
        provider_id, cert_path, star_tier, cert_label,
        composite_score, status, awarded_at, created_by
      ) VALUES (
        NEW.id, 'vip', 3, 'eminent',
        100.0, 'active', NOW(), NEW.user_id
      )
      ON CONFLICT (provider_id, cert_path, status) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_solution_providers_auto_certify_vip
  AFTER UPDATE ON public.solution_providers
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_certify_vip();