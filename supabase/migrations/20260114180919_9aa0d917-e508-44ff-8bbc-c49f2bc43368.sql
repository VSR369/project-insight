-- Add unique constraint for user_id + role and insert platform_admin role
ALTER TABLE public.user_roles 
ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);

-- Insert platform_admin role for user
INSERT INTO public.user_roles (user_id, role)
VALUES ('58fa3afe-e64a-4bc2-9c33-2ce267fe6f13', 'platform_admin')
ON CONFLICT (user_id, role) DO NOTHING;