INSERT INTO public.user_challenge_roles (challenge_id, user_id, role_code, is_active)
VALUES (
  '25ca71a0-3880-4338-99b3-e157f2b88b3b',
  '8f429cdb-20c6-49ab-8a3a-75b4a4cd257b',
  'FC',
  true
)
ON CONFLICT (challenge_id, user_id, role_code) DO UPDATE
SET is_active = true, revoked_at = null;