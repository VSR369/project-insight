-- Assign multiple roles to test users for portal switching

-- Give admin@test.local the panel_reviewer role (already has platform_admin and solution_provider)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'panel_reviewer'::app_role 
FROM auth.users 
WHERE email = 'admin@test.local'
ON CONFLICT (user_id, role) DO NOTHING;

-- Give provider@test.local the panel_reviewer role for testing
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'panel_reviewer'::app_role 
FROM auth.users 
WHERE email = 'provider@test.local'
ON CONFLICT (user_id, role) DO NOTHING;

-- Give reviewer@test.local the solution_provider role for testing
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'solution_provider'::app_role 
FROM auth.users 
WHERE email = 'reviewer@test.local'
ON CONFLICT (user_id, role) DO NOTHING;