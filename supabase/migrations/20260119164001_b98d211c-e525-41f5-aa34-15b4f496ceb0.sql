-- =====================================================
-- Fix: Update handle_new_user() trigger to copy address and pin_code from signup metadata
-- Also update test provider with realistic data
-- =====================================================

-- Update the handle_new_user function to include address and pin_code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_provider_id UUID;
  v_is_student BOOLEAN;
  v_industry_segment_id UUID;
  v_country_id UUID;
  v_enrollment_id UUID;
BEGIN
  -- Extract metadata
  v_is_student := COALESCE((NEW.raw_user_meta_data->>'is_student')::boolean, false);
  v_industry_segment_id := (NEW.raw_user_meta_data->>'industry_segment_id')::uuid;
  v_country_id := (NEW.raw_user_meta_data->>'country_id')::uuid;

  -- Create profile record
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

  -- Create solution_providers record with address and pin_code
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

  RETURN NEW;
END;
$$;

-- Update test provider with realistic data for manual testing
UPDATE public.solution_providers 
SET 
  first_name = 'John',
  last_name = 'Provider',
  address = '123 Test Street, Tech Park',
  pin_code = '560001',
  country_id = (SELECT id FROM public.countries WHERE code = 'IN' LIMIT 1)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'provider@test.local')
  AND (first_name = '' OR first_name IS NULL OR address IS NULL);