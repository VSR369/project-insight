-- Backfill missing profiles and solution_providers for users created before the trigger

-- Step 1: Create missing profiles records for users without them
INSERT INTO public.profiles (user_id, email, first_name, last_name)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', '')
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.id IS NULL;

-- Step 2: Create missing solution_providers records for users without them
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
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'first_name', ''),
  COALESCE(u.raw_user_meta_data->>'last_name', ''),
  COALESCE((u.raw_user_meta_data->>'is_student')::boolean, false),
  (u.raw_user_meta_data->>'industry_segment_id')::uuid,
  (u.raw_user_meta_data->>'country_id')::uuid,
  'registered',
  'not_started',
  u.id
FROM auth.users u
LEFT JOIN public.solution_providers sp ON sp.user_id = u.id
WHERE sp.id IS NULL;

-- Step 3: Add solution_provider role for users who don't have it
INSERT INTO public.user_roles (user_id, role, created_by)
SELECT u.id, 'solution_provider', u.id
FROM auth.users u
LEFT JOIN public.user_roles ur ON ur.user_id = u.id AND ur.role = 'solution_provider'
WHERE ur.id IS NULL;