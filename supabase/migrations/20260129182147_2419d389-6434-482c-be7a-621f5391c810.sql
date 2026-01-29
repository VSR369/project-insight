-- Add duration_seconds column to pulse_content for video/audio duration tracking
ALTER TABLE public.pulse_content
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.pulse_content.duration_seconds IS 'Duration of video/audio content in seconds (for reels and podcasts)';