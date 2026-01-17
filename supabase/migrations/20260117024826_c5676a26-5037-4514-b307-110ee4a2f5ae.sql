-- Add industry_segment_id column to proof_points for industry filtering
ALTER TABLE public.proof_points
  ADD COLUMN IF NOT EXISTS industry_segment_id UUID REFERENCES public.industry_segments(id);

-- Create index for filtering by industry
CREATE INDEX IF NOT EXISTS idx_proof_points_industry 
  ON public.proof_points(provider_id, industry_segment_id, is_deleted);

-- Backfill existing proof points with provider's current industry
UPDATE public.proof_points pp
SET industry_segment_id = (
  SELECT sp.industry_segment_id 
  FROM public.solution_providers sp 
  WHERE sp.id = pp.provider_id
)
WHERE pp.industry_segment_id IS NULL;