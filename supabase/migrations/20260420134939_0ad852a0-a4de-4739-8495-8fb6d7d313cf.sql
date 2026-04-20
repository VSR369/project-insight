
INSERT INTO public.user_challenge_roles (
  user_id, challenge_id, role_code, assigned_by,
  assigned_at, is_active, auto_assigned
)
SELECT
  '03e09698-5414-4872-897e-97b962a79e51'::uuid,
  c.id,
  'LC',
  '5c67ff44-51df-4562-9151-0545a5a9faf3'::uuid,
  NOW(),
  true,
  true
FROM public.challenges c
WHERE c.id = '25ca71a0-3880-4338-99b3-e157f2b88b3b'::uuid
ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE SET
  is_active = true, revoked_at = NULL, assigned_at = NOW();
