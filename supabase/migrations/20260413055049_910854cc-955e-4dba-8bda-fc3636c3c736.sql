-- Fix VIP Expert registration: 'expert' → 'eminent' in handle_new_user trigger
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
      registration_mode, invitation_id, created_by
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
      v_registration_mode, v_invitation_id, NEW.id
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