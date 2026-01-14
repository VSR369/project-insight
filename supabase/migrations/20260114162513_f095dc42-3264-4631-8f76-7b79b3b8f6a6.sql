-- Phase 4A: Database Trigger for Auto-User Creation
-- This trigger fires when a new user signs up and creates all required records

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

  -- Create solution_providers record
  INSERT INTO public.solution_providers (
    user_id,
    first_name,
    last_name,
    is_student,
    industry_segment_id,
    country_id,
    lifecycle_status,
    onboarding_status,
    created_by
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
    v_is_student,
    v_industry_segment_id,
    v_country_id,
    'registered',
    'not_started',
    NEW.id
  )
  RETURNING id INTO v_provider_id;

  -- Create student_profiles record if user is a student
  IF v_is_student THEN
    INSERT INTO public.student_profiles (
      provider_id,
      institution,
      discipline_id,
      stream_id,
      subject_id,
      graduation_year
    ) VALUES (
      v_provider_id,
      NEW.raw_user_meta_data->>'institution',
      (NEW.raw_user_meta_data->>'discipline_id')::uuid,
      (NEW.raw_user_meta_data->>'stream_id')::uuid,
      (NEW.raw_user_meta_data->>'subject_id')::uuid,
      (NEW.raw_user_meta_data->>'graduation_year')::integer
    );
  END IF;

  -- Assign solution_provider role
  INSERT INTO public.user_roles (
    user_id,
    role,
    created_by
  ) VALUES (
    NEW.id,
    'solution_provider',
    NEW.id
  );

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();