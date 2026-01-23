-- Phase 1: Fix handle_new_user() trigger to respect role_type metadata
-- This prevents creating solution_providers records for reviewers and admins

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_provider_id UUID;
  v_is_student BOOLEAN;
  v_industry_segment_id UUID;
  v_country_id UUID;
  v_enrollment_id UUID;
  v_role_type TEXT;
BEGIN
  -- Extract role type from metadata (set by reviewer/admin registration)
  -- Default to 'provider' for backward compatibility
  v_role_type := COALESCE(NEW.raw_user_meta_data->>'role_type', 'provider');
  
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
      'registered',
      20,
      'not_started',
      NEW.id
    )
    RETURNING id INTO v_provider_id;

    -- If industry_segment_id was provided (student flow), create the enrollment
    IF v_industry_segment_id IS NOT NULL THEN
      INSERT INTO public.provider_industry_enrollments (
        provider_id,
        industry_segment_id,
        is_primary,
        lifecycle_status,
        lifecycle_rank,
        created_by
      ) VALUES (
        v_provider_id,
        v_industry_segment_id,
        true,
        'registered',
        20,
        NEW.id
      )
      RETURNING id INTO v_enrollment_id;
    END IF;
  END IF;
  -- Note: role_type = 'reviewer' or 'admin' intentionally skip provider creation

  RETURN NEW;
END;
$function$;

-- Phase 2: Clean up existing bad data
-- Delete orphaned enrollments for users who are reviewers (self-signup)
DELETE FROM provider_industry_enrollments 
WHERE provider_id IN (
  SELECT sp.id FROM solution_providers sp
  INNER JOIN panel_reviewers pr ON sp.user_id = pr.user_id
  WHERE pr.enrollment_source = 'self_signup'
);

-- Delete orphaned provider records for users who are reviewers (self-signup)
DELETE FROM solution_providers 
WHERE user_id IN (
  SELECT pr.user_id FROM panel_reviewers pr
  WHERE pr.enrollment_source = 'self_signup'
);