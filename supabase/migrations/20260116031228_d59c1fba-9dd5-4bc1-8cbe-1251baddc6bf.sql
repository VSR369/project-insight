-- Create provider_proficiency_areas table for multi-select proficiency areas
CREATE TABLE public.provider_proficiency_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES public.solution_providers(id) ON DELETE CASCADE,
  proficiency_area_id UUID NOT NULL REFERENCES public.proficiency_areas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(provider_id, proficiency_area_id)
);

-- Create indexes for performance
CREATE INDEX idx_provider_proficiency_areas_provider ON public.provider_proficiency_areas(provider_id);
CREATE INDEX idx_provider_proficiency_areas_area ON public.provider_proficiency_areas(proficiency_area_id);

-- Enable Row Level Security
ALTER TABLE public.provider_proficiency_areas ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Providers can manage their own area selections
CREATE POLICY "Providers view own areas" 
  ON public.provider_proficiency_areas 
  FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.solution_providers sp 
    WHERE sp.id = provider_proficiency_areas.provider_id 
    AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Providers insert own areas" 
  ON public.provider_proficiency_areas 
  FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.solution_providers sp 
    WHERE sp.id = provider_proficiency_areas.provider_id 
    AND sp.user_id = auth.uid()
  ));

CREATE POLICY "Providers delete own areas" 
  ON public.provider_proficiency_areas 
  FOR DELETE 
  USING (EXISTS (
    SELECT 1 FROM public.solution_providers sp 
    WHERE sp.id = provider_proficiency_areas.provider_id 
    AND sp.user_id = auth.uid()
  ));

-- Admin can manage all
CREATE POLICY "Admin manage provider_proficiency_areas" 
  ON public.provider_proficiency_areas 
  FOR ALL 
  USING (has_role(auth.uid(), 'platform_admin'::app_role));