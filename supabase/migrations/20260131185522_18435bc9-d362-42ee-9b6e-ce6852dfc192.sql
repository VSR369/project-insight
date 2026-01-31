-- Add pulse_headline column to pulse_provider_stats table
ALTER TABLE public.pulse_provider_stats 
  ADD COLUMN IF NOT EXISTS pulse_headline TEXT DEFAULT NULL;

COMMENT ON COLUMN public.pulse_provider_stats.pulse_headline 
  IS 'User-defined professional headline shown in Pulse (LinkedIn-style)';