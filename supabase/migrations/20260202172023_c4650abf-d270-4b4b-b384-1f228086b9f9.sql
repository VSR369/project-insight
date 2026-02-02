-- Phase 1: Database Schema Additions for Provider Status Gaps
-- Priority: HIGH | Risk: LOW

-- 1.1 Add registration_mode enum type
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'registration_mode') THEN
    CREATE TYPE registration_mode AS ENUM ('self_registered', 'invitation');
  END IF;
END$$;

-- 1.2 Add registration_mode column to solution_providers
ALTER TABLE solution_providers 
  ADD COLUMN IF NOT EXISTS registration_mode registration_mode NOT NULL DEFAULT 'self_registered';

-- 1.3 Add invitation_id FK to solution_providers for traceability
ALTER TABLE solution_providers
  ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES solution_provider_invitations(id);

-- 1.4 Add certification tracking columns to provider_industry_enrollments
ALTER TABLE provider_industry_enrollments
  ADD COLUMN IF NOT EXISTS composite_score DECIMAL(5,2),
  ADD COLUMN IF NOT EXISTS certification_level VARCHAR(20),
  ADD COLUMN IF NOT EXISTS star_rating INTEGER,
  ADD COLUMN IF NOT EXISTS certified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS certified_by UUID REFERENCES auth.users(id);

-- 1.5 Add check constraint for star_rating (0-3)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'provider_industry_enrollments_star_rating_check'
  ) THEN
    ALTER TABLE provider_industry_enrollments 
      ADD CONSTRAINT provider_industry_enrollments_star_rating_check 
      CHECK (star_rating IS NULL OR (star_rating >= 0 AND star_rating <= 3));
  END IF;
END$$;

-- 1.6 Add index for certification reporting queries
CREATE INDEX IF NOT EXISTS idx_enrollments_certification 
  ON provider_industry_enrollments(certification_level, star_rating) 
  WHERE lifecycle_status = 'certified';

-- 1.7 Create finalize_certification function
CREATE OR REPLACE FUNCTION public.finalize_certification(
  p_enrollment_id UUID,
  p_composite_score DECIMAL,
  p_certifying_user_id UUID
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_certification_level VARCHAR(20);
  v_star_rating INTEGER;
  v_new_status lifecycle_status;
BEGIN
  -- Calculate certification level based on composite score
  IF p_composite_score < 51.0 THEN
    v_certification_level := NULL;
    v_star_rating := NULL;
    v_new_status := 'not_certified';
  ELSIF p_composite_score < 66.0 THEN
    v_certification_level := 'basic';
    v_star_rating := 1;
    v_new_status := 'certified';
  ELSIF p_composite_score < 86.0 THEN
    v_certification_level := 'competent';
    v_star_rating := 2;
    v_new_status := 'certified';
  ELSE
    v_certification_level := 'expert';
    v_star_rating := 3;
    v_new_status := 'certified';
  END IF;

  -- Update enrollment with certification details
  UPDATE provider_industry_enrollments
  SET 
    composite_score = p_composite_score,
    certification_level = v_certification_level,
    star_rating = v_star_rating,
    lifecycle_status = v_new_status,
    lifecycle_rank = CASE WHEN v_new_status = 'certified' THEN 140 ELSE 150 END,
    certified_at = CASE WHEN v_new_status = 'certified' THEN NOW() ELSE NULL END,
    certified_by = p_certifying_user_id,
    updated_at = NOW(),
    updated_by = p_certifying_user_id
  WHERE id = p_enrollment_id;

  -- Update verification_status on provider
  UPDATE solution_providers sp
  SET 
    verification_status = CASE WHEN v_new_status = 'certified' THEN 'verified' ELSE 'rejected' END,
    updated_at = NOW()
  WHERE id = (SELECT provider_id FROM provider_industry_enrollments WHERE id = p_enrollment_id);

  RETURN json_build_object(
    'success', true,
    'certification_level', v_certification_level,
    'star_rating', v_star_rating,
    'lifecycle_status', v_new_status::text
  );
END;
$$;

-- 1.8 Update handle_new_user trigger to support invitation flow and VIP bypass
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
  -- Extract role type from metadata (set by reviewer/admin registration)
  -- Default to 'provider' for backward compatibility
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'provider');
  
  -- Extract invitation context
  v_invitation_id := (NEW.raw_user_meta_data->>'invitation_id')::uuid;
  
  -- Determine registration mode
  IF v_invitation_id IS NOT NULL THEN
    v_registration_mode := 'invitation';
    -- Lookup invitation type for VIP handling
    SELECT invitation_type INTO v_invitation_type
    FROM solution_provider_invitations
    WHERE id = v_invitation_id;
  ELSE
    v_registration_mode := 'self_registered';
    v_invitation_type := NULL;
  END IF;
  
  -- Extract other metadata
  v_is_student := COALESCE((NEW.raw_user_meta_data->>'is_student')::boolean, false);
  v_industry_segment_id := (NEW.raw_user_meta_data->>'industry_segment_id')::uuid;
  v_country_id := (NEW.raw_user_meta_data->>'country_id')::uuid;

  -- Create profile record for ALL users (regardless of role)
  INSERT INTO public.profiles (
    user_id,
    email,
    first_name,
    last_name
  ) VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );

  -- Only create solution_providers for PROVIDER role type
  -- Reviewers are handled by register-reviewer-application edge function
  -- Admins are handled by register-admin edge function
  IF v_role_type = 'provider' THEN
    INSERT INTO public.solution_providers (
      user_id,
      first_name,
      last_name,
      is_student,
      industry_segment_id,
      country_id,
      address,
      pin_code,
      lifecycle_status,
      lifecycle_rank,
      onboarding_status,
      registration_mode,
      invitation_id,
      created_by
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
      v_is_student,
      v_industry_segment_id,
      v_country_id,
      NEW.raw_user_meta_data->>'address',
      NEW.raw_user_meta_data->>'pin_code',
      CASE WHEN v_invitation_type = 'vip_expert' THEN 'certified' ELSE 'registered' END,
      CASE WHEN v_invitation_type = 'vip_expert' THEN 140 ELSE 20 END,
      CASE WHEN v_invitation_type = 'vip_expert' THEN 'completed' ELSE 'not_started' END,
      v_registration_mode,
      v_invitation_id,
      NEW.id
    )
    RETURNING id INTO v_provider_id;

    -- If industry_segment_id was provided (student flow or VIP), create the enrollment
    IF v_industry_segment_id IS NOT NULL THEN
      INSERT INTO public.provider_industry_enrollments (
        provider_id,
        industry_segment_id,
        is_primary,
        lifecycle_status,
        lifecycle_rank,
        composite_score,
        certification_level,
        star_rating,
        certified_at,
        created_by
      ) VALUES (
        v_provider_id,
        v_industry_segment_id,
        true,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 'certified' ELSE 'registered' END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 140 ELSE 20 END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 100.0 ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 'expert' ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN 3 ELSE NULL END,
        CASE WHEN v_invitation_type = 'vip_expert' THEN NOW() ELSE NULL END,
        NEW.id
      )
      RETURNING id INTO v_enrollment_id;
    END IF;
    
    -- Mark invitation as accepted if applicable
    IF v_invitation_id IS NOT NULL THEN
      UPDATE solution_provider_invitations
      SET accepted_at = NOW(),
          updated_at = NOW()
      WHERE id = v_invitation_id;
    END IF;
  END IF;
  -- Note: role_type = 'reviewer' or 'admin' intentionally skip provider creation

  RETURN NEW;
END;
$$;