
-- 1. solution_providers columns
ALTER TABLE public.solution_providers
  ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS invitation_code TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_solution_providers_is_vip
  ON public.solution_providers (is_vip) WHERE is_vip = TRUE;

-- 2. provider_industry_enrollments columns
ALTER TABLE public.provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS geographies_served TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS outcomes_delivered TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_enrollments_geographies
  ON public.provider_industry_enrollments USING GIN (geographies_served);
CREATE INDEX IF NOT EXISTS idx_enrollments_outcomes
  ON public.provider_industry_enrollments USING GIN (outcomes_delivered);

-- 3. Update handle_new_user to set is_vip
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_provider_id UUID;
  v_is_student BOOLEAN;
  v_industry_segment_id UUID;
  v_country_id UUID;
  v_enrollment_id UUID;
  v_role_type TEXT;
  v_invitation_id UUID;
  v_invitation_type TEXT;
  v_registration_mode registration_mode;
BEGIN
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'provider');
  v_invitation_id := (NEW.raw_user_meta_data->>'invitation_id')::uuid;

  IF v_invitation_id IS NOT NULL THEN
    v_registration_mode := 'invitation';
    SELECT invitation_type INTO v_invitation_type
    FROM solution_provider_invitations
    WHERE id = v_invitation_id;
  ELSE
    v_registration_mode := 'self_registered';
    v_invitation_type := NULL;
  END IF;

  v_is_student := COALESCE((NEW.raw_user_meta_data->>'is_student')::boolean, false);
  v_industry_segment_id := (NEW.raw_user_meta_data->>'industry_segment_id')::uuid;
  v_country_id := (NEW.raw_user_meta_data->>'country_id')::uuid;

  INSERT INTO public.profiles (
    user_id, email, first_name, last_name
  ) VALUES (
    NEW.id, NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );

  IF v_role_type = 'provider' THEN
    INSERT INTO public.solution_providers (
      user_id, first_name, last_name, is_student,
      industry_segment_id, country_id, address, pin_code,
      lifecycle_status, lifecycle_rank, onboarding_status,
      registration_mode, invitation_id, is_vip, created_by
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      v_is_student, v_industry_segment_id, v_country_id,
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'pin_code',
      CASE WHEN v_invitation_type = 'vip_expert' THEN 'certified' ELSE 'registered' END,
      CASE WHEN v_invitation_type = 'vip_expert' THEN 140 ELSE 20 END,
      CASE WHEN v_invitation_type = 'vip_expert' THEN 'completed' ELSE 'not_started' END,
      v_registration_mode, v_invitation_id,
      (v_invitation_type = 'vip_expert'),
      NEW.id
    )
    RETURNING id INTO v_provider_id;

    IF v_industry_segment_id IS NOT NULL THEN
      INSERT INTO public.provider_industry_enrollments (
        provider_id, industry_segment_id, is_primary,
        lifecycle_status, lifecycle_rank, composite_score,
        certification_level, star_rating, certified_at, created_by
      ) VALUES (
        v_provider_id, v_industry_segment_id, true,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 'certified' ELSE 'registered' END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 140 ELSE 20 END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 100.0 ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 'eminent' ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 3 ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN NOW() ELSE NULL END,
        NEW.id
      )
      RETURNING id INTO v_enrollment_id;
    END IF;

    IF v_invitation_id IS NOT NULL THEN
      UPDATE solution_provider_invitations
      SET accepted_at = NOW(), updated_at = NOW()
      WHERE id = v_invitation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. v_provider_dashboard
CREATE OR REPLACE VIEW public.v_provider_dashboard AS
SELECT
  sp.id AS provider_id,
  sp.user_id,
  sp.first_name,
  sp.last_name,
  sp.bio_tagline,
  sp.avatar_url,
  sp.provider_level,
  sp.profile_strength,
  sp.is_vip,
  sp.lifecycle_status AS provider_status,
  pie.id AS enrollment_id,
  pie.industry_segment_id,
  ise.name AS industry_name,
  pie.expertise_level_id,
  el.name AS expertise_level_name,
  el.level_number AS expertise_level_number,
  pie.lifecycle_status AS enrollment_status,
  pie.is_primary,
  pie.composite_score,
  pie.certification_level,
  pie.star_rating,
  pie.geographies_served,
  pie.outcomes_delivered,
  pc.cert_path,
  pc.star_tier AS cert_star_tier,
  pc.status AS cert_status,
  pps.composite_score AS perf_composite_score,
  pps.quality_score,
  pps.consistency_score,
  pps.engagement_score,
  pps.responsiveness_score,
  pps.expertise_depth_score,
  pps.community_impact_score
FROM public.solution_providers sp
LEFT JOIN public.provider_industry_enrollments pie ON pie.provider_id = sp.id
LEFT JOIN public.industry_segments ise ON ise.id = pie.industry_segment_id
LEFT JOIN public.expertise_levels el ON el.id = pie.expertise_level_id
LEFT JOIN public.provider_certifications pc ON pc.provider_id = sp.id
  AND pc.enrollment_id = pie.id
  AND pc.status = 'active'
LEFT JOIN public.provider_performance_scores pps ON pps.provider_id = sp.id;

-- 5. v_challenge_match
CREATE OR REPLACE VIEW public.v_challenge_match AS
SELECT
  c.id AS challenge_id,
  c.title,
  c.industry_segment_id,
  ise.name AS industry_name,
  c.complexity_level,
  c.solver_audience,
  c.min_star_tier,
  c.status AS challenge_status,
  c.submission_deadline,
  c.reward_amount,
  c.currency_code,
  c.domain_tags,
  c.solver_eligibility_id,
  c.organization_id,
  so.organization_name
FROM public.challenges c
LEFT JOIN public.industry_segments ise ON ise.id = c.industry_segment_id
LEFT JOIN public.seeker_organizations so ON so.id = c.organization_id
WHERE c.is_deleted = FALSE AND c.is_active = TRUE;

-- 6. v_cert_leaderboard (using correct column: resolved_cert_label)
CREATE OR REPLACE VIEW public.v_cert_leaderboard AS
SELECT
  sp.id AS provider_id,
  sp.first_name,
  sp.last_name,
  sp.avatar_url,
  sp.is_vip,
  pie.industry_segment_id,
  ise.name AS industry_name,
  pie.certification_level,
  pie.star_rating,
  pie.composite_score,
  pie.certified_at,
  vrc.resolved_star_tier,
  vrc.resolved_cert_label
FROM public.solution_providers sp
INNER JOIN public.provider_industry_enrollments pie ON pie.provider_id = sp.id
INNER JOIN public.industry_segments ise ON ise.id = pie.industry_segment_id
LEFT JOIN public.vw_provider_resolved_cert vrc ON vrc.provider_id = sp.id
WHERE pie.certification_level IS NOT NULL
ORDER BY pie.star_rating DESC NULLS LAST, pie.composite_score DESC NULLS LAST;
