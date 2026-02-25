-- Remove incorrect platform_admin role for user vsr@btbt.co.in
DELETE FROM public.user_roles 
WHERE user_id = '58fa3afe-e64a-4bc2-9c33-2ce267fe6f13' 
  AND role = 'platform_admin';