ALTER TABLE public.challenges 
ADD COLUMN IF NOT EXISTS solver_visibility_types JSONB DEFAULT '[]'::jsonb;