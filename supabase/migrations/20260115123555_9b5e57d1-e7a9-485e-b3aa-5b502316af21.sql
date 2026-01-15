-- Add description column to academic_disciplines
ALTER TABLE public.academic_disciplines 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add description column to academic_streams
ALTER TABLE public.academic_streams 
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add description column to academic_subjects
ALTER TABLE public.academic_subjects 
ADD COLUMN IF NOT EXISTS description TEXT;