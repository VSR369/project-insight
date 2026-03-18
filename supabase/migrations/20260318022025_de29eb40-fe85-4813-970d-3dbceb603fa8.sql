
-- Add submission_template_url to challenges for storing the uploaded template path
ALTER TABLE public.challenges
ADD COLUMN IF NOT EXISTS submission_template_url text;

COMMENT ON COLUMN public.challenges.submission_template_url IS 'Supabase Storage path to the optional submission template file (PDF/DOCX)';
