
-- Step 1: Reassign CU role from vsr to Casey Underwood

-- 1a: Deactivate vsr's CU role on this challenge
UPDATE public.user_challenge_roles
SET is_active = false, updated_at = NOW()
WHERE user_id = '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13'
  AND challenge_id = '25ca71a0-3880-4338-99b3-e157f2b88b3b'
  AND role_code = 'CU';

-- 1b: Insert/upsert Casey's CU role
INSERT INTO public.user_challenge_roles (user_id, challenge_id, role_code, is_active, auto_assigned, assigned_by)
VALUES (
  '5c67ff44-51df-4562-9151-0545a5a9faf3',
  '25ca71a0-3880-4338-99b3-e157f2b88b3b',
  'CU',
  true,
  true,
  '376d7eb8-ce4f-48bd-ac35-4a666756af69'
)
ON CONFLICT (user_id, challenge_id, role_code) DO UPDATE
SET is_active = true, updated_at = NOW();

-- 1c: Update challenge_role_assignments to point to Casey's pool entry
UPDATE public.challenge_role_assignments
SET pool_member_id = '77d04806-5e10-42e2-83a2-54176707f09c',
    updated_at = NOW()
WHERE id = 'c4143d70-b87b-4f01-aa41-d01e70ef8cb6';

-- 1d: Fix pool counters — decrement vsr, keep Casey at 0 (she gets 1 from the assignment trigger if any)
UPDATE public.platform_provider_pool
SET current_assignments = GREATEST(current_assignments - 1, 0)
WHERE id = '3b8b2405-9f58-435d-9e28-e96fb2302e8f';

-- Step 2: Deactivate non-demo pool members
UPDATE public.platform_provider_pool
SET is_active = false, updated_at = NOW()
WHERE email NOT LIKE '%@testsetup.dev'
  AND is_active = true;
