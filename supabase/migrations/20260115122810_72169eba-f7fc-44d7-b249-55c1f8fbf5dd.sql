-- Remove the existing check constraint that prevents level_number = 0
ALTER TABLE public.expertise_levels DROP CONSTRAINT IF EXISTS expertise_levels_level_number_check;

-- Add a new constraint allowing level_number >= 0
ALTER TABLE public.expertise_levels ADD CONSTRAINT expertise_levels_level_number_check CHECK (level_number >= 0);