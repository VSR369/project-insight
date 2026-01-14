-- Assign platform_admin role to admin@test.local
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'platform_admin'::app_role 
FROM auth.users 
WHERE email = 'admin@test.local'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign solution_provider role to provider@test.local
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'solution_provider'::app_role 
FROM auth.users 
WHERE email = 'provider@test.local'
ON CONFLICT (user_id, role) DO NOTHING;